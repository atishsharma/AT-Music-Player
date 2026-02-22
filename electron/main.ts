import { app, BrowserWindow, protocol, shell } from 'electron'

// Required for Linux: Chromium sandbox needs SUID helper or --no-sandbox
// Without this, packaged AppImage will core dump (SIGTRAP) on most distros
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'atmusic', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: false, stream: true } }
])

import { fileURLToPath } from 'node:url'

import path from 'node:path'
import { initDB } from './db'
import { registerHandlers } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// Initialize Database early
initDB();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    icon: VITE_DEV_SERVER_URL
      ? path.join(process.env.APP_ROOT, 'public', 'app_icon.png')
      : path.join(process.resourcesPath, 'app_icon.png'),
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  win.maximize();

  // Register IPC handlers
  registerHandlers(win);

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  protocol.handle('atmusic', async (request) => {
    try {
      let decodedPath = '';

      try {
        const parsedUrl = new URL(request.url);
        if (parsedUrl.searchParams.has('path')) {
          decodedPath = parsedUrl.searchParams.get('path') || '';
        }
      } catch (e) {
        // Fallback for parsing errors
      }

      if (!decodedPath) {
        // Fallback logic for raw paths (atmusic://C:/Users/...)
        const filePath = request.url.replace(/^atmusic:\/\//, '');
        decodedPath = decodeURIComponent(filePath.split('?')[0]);

        if (process.platform === 'win32') {
          // Electron's URL parser treats the drive letter as the URL hostname,
          // lowercases it, and strips the colon:
          //   atmusic://C:/Users/... → request.url = 'atmusic://c/Users/...'
          if (decodedPath.match(/^[a-zA-Z]\//) && !decodedPath.includes(':')) {
            decodedPath = decodedPath[0].toUpperCase() + ':/' + decodedPath.slice(2);
          }
          // Also handle the '/C:/...' form just in case
          if (decodedPath.startsWith('/') && decodedPath.match(/^\/[a-zA-Z]:/)) {
            decodedPath = decodedPath.substring(1);
          }
        } else {
          if (!decodedPath.startsWith('/')) {
            decodedPath = '/' + decodedPath;
          }
        }
      }

      const fs = await import('node:fs');
      const { stat } = await import('node:fs/promises');
      const { Readable } = await import('node:stream');

      const stats = await stat(decodedPath);
      const size = stats.size;
      const ext = path.extname(decodedPath).toLowerCase();
      const contentType = ext === '.mp3' ? 'audio/mpeg' :
        ext === '.webm' ? 'audio/webm; codecs=opus' :
          ext === '.opus' ? 'audio/ogg; codecs=opus' :
            ext === '.ogg' ? 'audio/ogg' :
              ext === '.png' ? 'image/png' :
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                  'application/octet-stream';

      const rangeHeader = request.headers.get('Range');

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
        const chunksize = (end - start) + 1;

        const stream = fs.createReadStream(decodedPath, { start, end });
        // Convert Node stream to Web Stream for better Electron Response compatibility
        const webStream = Readable.toWeb(stream);

        return new Response(webStream as any, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const stream = fs.createReadStream(decodedPath);
      const webStream = Readable.toWeb(stream);

      return new Response(webStream as any, {
        status: 200,
        headers: {
          'Content-Length': size.toString(),
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      console.error('atmusic protocol error:', err);
      return new Response('File not found', { status: 404 });
    }
  });
  createWindow();
});
