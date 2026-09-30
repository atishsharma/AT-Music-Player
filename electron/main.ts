import { app, BrowserWindow, protocol, shell, Tray, Menu, nativeImage, ipcMain, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { initDB, getSetting, getDB } from './db'
import { registerHandlers } from './ipc'

// Initialize Database early (settings below are needed before `ready`)
initDB();

// Required for Linux: Chromium sandbox needs SUID helper or --no-sandbox
// Without this, packaged AppImage will core dump (SIGTRAP) on most distros
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// Hardware acceleration: previously disabled unconditionally, which forced every blur,
// transform and canvas visualizer onto the CPU on all platforms (while also setting
// contradictory GPU rasterization flags). Now on by default for Windows/macOS, off by
// default on Linux (blank-screen/VSync issues), and user-overridable in Settings.
const hwSetting = getSetting('hardware_acceleration');
const useHardwareAcceleration = hwSetting !== null ? hwSetting === 'true' : process.platform !== 'linux';
if (useHardwareAcceleration) {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
} else {
  app.disableHardwareAcceleration();
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'atmusic', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: false, stream: true } }
])

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let widgetWin: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Only one instance: a second launch focuses the existing window instead of
// opening a second player fighting over the same database and audio output.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow());
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

function setSetting(key: string, value: string) {
  try {
    getDB().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  } catch (err) {
    console.error('Failed to save setting', key, err);
  }
}

function getIconPath(): string {
  if (VITE_DEV_SERVER_URL) {
    return path.join(process.env.APP_ROOT!, 'public', 'app_icon.png');
  }
  return path.join(process.resourcesPath, 'app_icon.png');
}

function loadRoute(target: BrowserWindow, hash = '') {
  if (VITE_DEV_SERVER_URL) {
    target.loadURL(`${VITE_DEV_SERVER_URL}${hash ? `#${hash}` : ''}`)
  } else {
    target.loadFile(path.join(RENDERER_DIST, 'index.html'), hash ? { hash } : undefined)
  }
}

function showMainWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ---------------------------------------------------------------------------
// Window state push (replaces 2x 500ms renderer polling loops over IPC)
// ---------------------------------------------------------------------------
function isMiniPlayerMode() {
  if (!win) return false;
  const [width] = win.getSize();
  return width <= 500;
}

function sendWindowState() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('window:state', {
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen(),
    isMiniPlayer: isMiniPlayerMode(),
  });
}

// ---------------------------------------------------------------------------
// Desktop widget: a small always-on-top window shown while the main window is
// minimized to the taskbar.
// ---------------------------------------------------------------------------
type WidgetStyle = 'pill' | 'card' | 'orb';
const WIDGET_SIZES: Record<WidgetStyle, { width: number; height: number }> = {
  pill: { width: 380, height: 96 },
  card: { width: 280, height: 340 },
  orb: { width: 200, height: 200 },
};

let lastPlayerState: unknown = null;

function widgetConfig() {
  const style = (getSetting('widget_style') as WidgetStyle) || 'pill';
  return {
    enabled: getSetting('widget_enabled') !== 'false',
    alwaysOnTop: getSetting('widget_always_on_top') !== 'false',
    style: WIDGET_SIZES[style] ? style : 'pill' as WidgetStyle,
  };
}

function widgetPosition(size: { width: number; height: number }) {
  const saved = getSetting('widget_position');
  if (saved) {
    try {
      const { x, y } = JSON.parse(saved);
      // Only reuse the saved position if it is still on a connected display
      const visible = screen.getAllDisplays().some(d =>
        x >= d.workArea.x && y >= d.workArea.y &&
        x + 40 <= d.workArea.x + d.workArea.width && y + 40 <= d.workArea.y + d.workArea.height);
      if (visible) return { x, y };
    } catch { /* ignore */ }
  }
  const { workArea } = screen.getPrimaryDisplay();
  return { x: workArea.x + workArea.width - size.width - 24, y: workArea.y + workArea.height - size.height - 24 };
}

function applyAlwaysOnTop(target: BrowserWindow, onTop: boolean) {
  // 'floating' keeps it above normal windows without covering full-screen apps/menus
  target.setAlwaysOnTop(onTop, 'floating');
  if (process.platform === 'darwin') {
    target.setVisibleOnAllWorkspaces(onTop, { visibleOnFullScreen: true });
  }
}

function createWidgetWindow() {
  const config = widgetConfig();
  const size = WIDGET_SIZES[config.style];
  const pos = widgetPosition(size);

  widgetWin = new BrowserWindow({
    ...size,
    ...pos,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  applyAlwaysOnTop(widgetWin, config.alwaysOnTop);

  widgetWin.on('moved', () => {
    if (!widgetWin) return;
    const [x, y] = widgetWin.getPosition();
    setSetting('widget_position', JSON.stringify({ x, y }));
  });
  widgetWin.on('closed', () => { widgetWin = null; });

  loadRoute(widgetWin, '/widget');
}

function showWidget() {
  if (!widgetConfig().enabled) return;
  if (!widgetWin) createWidgetWindow();
  const target = widgetWin!;
  // Don't steal focus from whatever the user switched to
  if (target.webContents.isLoading()) target.once('ready-to-show', () => target.showInactive());
  else target.showInactive();
}

function hideWidget() {
  widgetWin?.hide();
}

function createTray() {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'AT Music Pro', click: () => showMainWindow() },
    { label: 'Minimize to Tray', click: () => win?.hide() },
    {
      label: 'Maximize / Restore',
      click: () => {
        if (win) {
          win.show();
          if (win.isMaximized()) win.unmaximize();
          else win.maximize();
        }
      }
    },
    { label: 'Show Desktop Widget', click: () => showWidget() },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => win?.webContents.send('tray:playPause') },
    { label: 'Next Track', click: () => win?.webContents.send('tray:next') },
    { label: 'Previous Track', click: () => win?.webContents.send('tray:prev') },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('AT Music Pro');
  tray.setContextMenu(contextMenu);

  // A single 'click' handler is enough: with both 'click' and 'double-click' a
  // double-click toggled the window twice (hide then show) on Windows.
  tray.on('click', () => {
    if (!win) return;
    if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
      win.hide();
    } else {
      showMainWindow();
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: getIconPath(),
    fullscreenable: true,
    backgroundColor: '#101418',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  // Show once painted: avoids the white flash on startup
  win.once('ready-to-show', () => {
    win?.maximize();
    win?.show();
  });

  // Register IPC handlers (idempotent; re-points to the new window if re-created)
  registerHandlers(win);

  // Minimize to tray instead of closing
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => { win = null; });

  // Desktop widget follows the main window's minimized state
  win.on('minimize', () => showWidget());
  win.on('restore', () => hideWidget());
  win.on('show', () => { if (!win?.isMinimized()) hideWidget(); });

  win.on('maximize', sendWindowState);
  win.on('unmaximize', sendWindowState);
  win.on('resize', sendWindowState);
  win.on('enter-full-screen', sendWindowState);
  win.on('leave-full-screen', sendWindowState);

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  loadRoute(win);
}

// Window control IPC handlers
ipcMain.handle('window:minimize', () => win?.minimize());
ipcMain.handle('window:maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});
ipcMain.handle('window:close', () => {
  win?.hide(); // Minimize to tray
});
ipcMain.handle('window:isMaximized', () => win?.isMaximized());
ipcMain.handle('window:getState', () => ({
  isMaximized: win?.isMaximized() ?? false,
  isFullScreen: win?.isFullScreen() ?? false,
  isMiniPlayer: isMiniPlayerMode(),
}));
ipcMain.handle('window:toggleFullScreen', () => {
  if (win) {
    const isFull = win.isFullScreen();
    win.setFullScreen(!isFull);
    return !isFull;
  }
  return false;
});
ipcMain.handle('window:toggleAlwaysOnTop', (_event, alwaysOnTop: boolean) => {
  if (win) win.setAlwaysOnTop(alwaysOnTop);
});

// Mini player mode
ipcMain.handle('window:miniPlayer', () => {
  if (!win) return;
  win.unmaximize();
  win.setMaximizable(false);
  win.setMinimumSize(380, 712);
  win.setSize(380, 712);
  win.setAlwaysOnTop(true);
  win.setResizable(false);

  // Position bottom-right of the display the window is on (not always the primary one)
  const { workArea } = screen.getDisplayMatching(win.getBounds());
  win.setPosition(workArea.x + workArea.width - 420, workArea.y + workArea.height - 752);
  sendWindowState();
});

ipcMain.handle('window:setMiniPlayerResizable', (_event, resizable: boolean) => {
  if (win && isMiniPlayerMode()) {
    win.setResizable(resizable);
    if (resizable) {
      win.setAspectRatio(380 / 712);
    } else {
      win.setAspectRatio(0);
      win.setSize(380, 712);
    }
  }
});

ipcMain.handle('window:normalMode', () => {
  if (!win) return;
  win.setAspectRatio(0); // Remove aspect ratio lock
  win.setMaximizable(true);
  win.setAlwaysOnTop(false);
  win.setResizable(true);
  win.setMinimumSize(1200, 800);
  win.maximize();
  sendWindowState();
});

ipcMain.handle('window:isMiniPlayer', () => isMiniPlayerMode());

// Widget IPC
ipcMain.on('widget:state', (_event, state) => {
  lastPlayerState = state;
  if (widgetWin && !widgetWin.isDestroyed() && widgetWin.isVisible()) {
    widgetWin.webContents.send('widget:state', state);
  }
});
ipcMain.handle('widget:getState', () => lastPlayerState);
ipcMain.handle('widget:getConfig', () => ({ ...widgetConfig(), platform: process.platform }));
ipcMain.on('widget:command', (_event, command) => {
  win?.webContents.send('player:command', command);
});
ipcMain.handle('widget:restore', () => {
  hideWidget();
  showMainWindow();
});
ipcMain.handle('widget:hide', () => hideWidget());
ipcMain.handle('widget:setAlwaysOnTop', (_event, onTop: boolean) => {
  setSetting('widget_always_on_top', String(onTop));
  if (widgetWin) applyAlwaysOnTop(widgetWin, onTop);
  return onTop;
});
ipcMain.handle('widget:setEnabled', (_event, enabled: boolean) => {
  setSetting('widget_enabled', String(enabled));
  if (!enabled) hideWidget();
  return enabled;
});
ipcMain.handle('widget:setStyle', (_event, style: WidgetStyle) => {
  if (!WIDGET_SIZES[style]) return;
  setSetting('widget_style', style);
  if (widgetWin) {
    const size = WIDGET_SIZES[style];
    // Keep the bottom-right corner anchored so the widget doesn't jump off-screen
    const [x, y] = widgetWin.getPosition();
    const [w, h] = widgetWin.getSize();
    widgetWin.setBounds({ x: x + w - size.width, y: y + h - size.height, ...size });
    widgetWin.webContents.send('widget:config', widgetConfig());
  }
  return style;
});
ipcMain.handle('widget:preview', () => showWidget());
ipcMain.handle('app:setHardwareAcceleration', (_event, enabled: boolean) => {
  setSetting('hardware_acceleration', String(enabled));
  return enabled;
});
ipcMain.handle('app:getHardwareAcceleration', () => useHardwareAcceleration);

app.on('before-quit', () => {
  isQuitting = true;
  widgetWin?.destroy();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (!win) {
    createWindow()
  } else {
    showMainWindow();
  }
})

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm; codecs=opus',
  '.opus': 'audio/ogg; codecs=opus',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function resolveProtocolPath(requestUrl: string): string {
  try {
    const parsedUrl = new URL(requestUrl);
    const fromQuery = parsedUrl.searchParams.get('path');
    if (fromQuery) return fromQuery;
  } catch {
    // Fallback below
  }

  // Fallback logic for raw paths (atmusic://C:/Users/...)
  let decodedPath = decodeURIComponent(requestUrl.replace(/^atmusic:\/\//, '').split('?')[0]);
  if (process.platform === 'win32') {
    if (decodedPath.match(/^[a-zA-Z]\//) && !decodedPath.includes(':')) {
      decodedPath = decodedPath[0].toUpperCase() + ':/' + decodedPath.slice(2);
    }
    if (decodedPath.startsWith('/') && decodedPath.match(/^\/[a-zA-Z]:/)) {
      decodedPath = decodedPath.substring(1);
    }
  } else if (!decodedPath.startsWith('/')) {
    decodedPath = '/' + decodedPath;
  }
  return decodedPath;
}

app.whenReady().then(() => {
  protocol.handle('atmusic', async (request) => {
    try {
      const decodedPath = resolveProtocolPath(request.url);
      const { size } = await stat(decodedPath);
      const contentType = MIME_TYPES[path.extname(decodedPath).toLowerCase()] || 'application/octet-stream';
      const baseHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        // Artwork and audio files are immutable per path; lets Chromium reuse decoded images
        'Cache-Control': 'max-age=3600',
      };

      const rangeHeader = request.headers.get('Range');
      const match = rangeHeader?.match(/bytes=(\d*)-(\d*)/);
      if (match && (match[1] || match[2])) {
        let start: number;
        let end: number;
        if (!match[1]) {
          // Suffix range: "bytes=-500" = last 500 bytes (previously parsed as NaN)
          start = Math.max(size - parseInt(match[2], 10), 0);
          end = size - 1;
        } else {
          start = parseInt(match[1], 10);
          end = match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
        }

        if (start >= size || start > end) {
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        }

        const stream = Readable.toWeb(fs.createReadStream(decodedPath, { start, end }));
        return new Response(stream as unknown as ReadableStream, {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': String(end - start + 1),
          }
        });
      }

      const stream = Readable.toWeb(fs.createReadStream(decodedPath));
      return new Response(stream as unknown as ReadableStream, {
        status: 200,
        headers: { ...baseHeaders, 'Content-Length': String(size) }
      });
    } catch (err) {
      console.error('atmusic protocol error:', err);
      return new Response('File not found', { status: 404 });
    }
  });

  if (!gotSingleInstanceLock) return;
  createTray();
  createWindow();
});
