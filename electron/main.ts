import { app, BrowserWindow, protocol, shell, Tray, Menu, nativeImage, ipcMain, screen, powerMonitor, powerSaveBlocker } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { initDB, getSetting, getDB } from './db'
import { registerHandlers } from './ipc'
import { stopSocial } from './ipc/social'
import { startRemote, stopRemote, remoteStatus, newRemoteToken } from './services/remote'
import { searchYouTube } from './services/ytdlp'

// Initialize Database early (settings below are needed before `ready`)
initDB();

// Required for Linux: Chromium sandbox needs SUID helper or --no-sandbox
// Without this, packaged AppImage will core dump (SIGTRAP) on most distros
if (process.platform === 'linux') {
  // Ties the MPRIS media player (and window grouping) to our .desktop file, so desktop
  // shells show the app name and icon instead of a generic "Chromium" entry.
  process.env.CHROME_DESKTOP = 'at-music-pro.desktop';
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

// Windows groups taskbar buttons, jump lists and notifications by this id; without it
// the taskbar can show Electron's default icon instead of the app icon.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.atmusic.pro');
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
  // Windows prefers .ico (crisp at every taskbar/title-bar size); others use the 1024px PNG
  const file = process.platform === 'win32' ? 'app_icon.ico' : 'app_icon.png';
  if (VITE_DEV_SERVER_URL) {
    return path.join(process.env.APP_ROOT!, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  }
  return path.join(process.resourcesPath, file);
}

function loadRoute(target: BrowserWindow, hash = '') {
  if (VITE_DEV_SERVER_URL) {
    target.loadURL(`${VITE_DEV_SERVER_URL}${hash ? `#${hash}` : ''}`)
  } else {
    target.loadFile(path.join(RENDERER_DIST, 'index.html'), hash ? { hash } : undefined)
  }
}

// Set while switching between the mini player and the full window: some compositors
// (GNOME/KDE on Wayland) report a transient "minimize" during the big resize, which used
// to open the desktop widget in place of the full app.
let windowModeChangeAt = 0;
const inModeChange = () => Date.now() - windowModeChangeAt < 1200;
let wasMaximizedBeforeMinimize = false;

function showMainWindow() {
  if (!win) return;
  if (win.isMinimized() || !win.isVisible()) {
    if (process.platform === 'linux') {
      // Wayland has no "un-minimize" request, so restore() is silently ignored there and the
      // window stayed hidden until the app was restarted. Re-mapping the window works on both
      // Wayland and X11.
      win.hide();
      win.show();
      if (wasMaximizedBeforeMinimize && !isMiniPlayerMode()) win.maximize();
    } else {
      win.restore();
    }
  }
  win.show();
  win.focus();
  hideWidget();
}

// ---------------------------------------------------------------------------
// Window state push (replaces 2x 500ms renderer polling loops over IPC)
// ---------------------------------------------------------------------------
function isMiniPlayerMode() {
  if (!win) return false;
  const [width] = win.getSize();
  return width <= 500;
}

// Rounded corners for the frameless mini player. The main window isn't transparent, so the
// corners are cut with a window shape (Windows, Linux X11/XWayland; macOS rounds natively).
const MINI_RADIUS = 18;
function applyMiniShape() {
  if (!win || process.platform === 'darwin' || typeof win.setShape !== 'function') return;
  if (!isMiniPlayerMode()) { win.setShape([]); return; }
  const [w, h] = win.getContentSize();
  const r = Math.min(MINI_RADIUS, Math.floor(Math.min(w, h) / 2));
  const rects: Electron.Rectangle[] = [];
  for (let y = 0; y < r; y++) {
    // Horizontal inset of the quarter circle at this row
    const inset = Math.ceil(r - Math.sqrt(r * r - (r - y - 0.5) ** 2));
    rects.push({ x: inset, y, width: w - inset * 2, height: 1 });
    rects.push({ x: inset, y: h - 1 - y, width: w - inset * 2, height: 1 });
  }
  rects.push({ x: 0, y: r, width: w, height: h - r * 2 });
  win.setShape(rects);
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
  // 'floating' keeps it above normal windows without covering full-screen apps/menus.
  // Toggle off first: some Linux window managers skip a repeated "above" request.
  if (process.platform === 'linux' && onTop) target.setAlwaysOnTop(false);
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
    alwaysOnTop: config.alwaysOnTop,
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
  const config = widgetConfig();
  if (!config.enabled) return;
  if (!widgetWin) createWidgetWindow();
  const target = widgetWin!;
  const reveal = () => {
    // Don't steal focus from whatever the user switched to
    target.showInactive();
    // Linux (X11/XWayland) ignores the "above" state if it is set before the window is
    // mapped, which is why pinning worked for the (already visible) mini player but not
    // for the widget. Re-apply once the window is on screen.
    applyAlwaysOnTop(target, config.alwaysOnTop);
    setTimeout(() => { if (!target.isDestroyed() && target.isVisible()) applyAlwaysOnTop(target, widgetConfig().alwaysOnTop); }, 150);
  };
  if (target.webContents.isLoading()) target.once('ready-to-show', reveal);
  else reveal();
}

function hideWidget() {
  widgetWin?.hide();
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath());
  // macOS menu bar icons are 16pt; Windows/Linux trays look best at 16-24px
  const trayIcon = icon.isEmpty() ? icon : icon.resize({ width: process.platform === 'darwin' ? 16 : 22, height: process.platform === 'darwin' ? 16 : 22, quality: 'best' });
  tray = new Tray(trayIcon);

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
    {
      label: 'Ambient Mode',
      click: () => {
        showMainWindow();
        win?.webContents.send('ambient:open');
      }
    },
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
  win.on('minimize', () => {
    if (inModeChange()) {
      // Spurious minimize while resizing between mini and full mode: undo it
      setTimeout(() => showMainWindow(), 50);
      return;
    }
    wasMaximizedBeforeMinimize = !!win?.isMaximized() || wasMaximizedBeforeMinimize;
    showWidget();
  });
  win.on('restore', () => hideWidget());
  win.on('show', () => { if (!win?.isMinimized()) hideWidget(); });
  // Back in front (taskbar click, Alt+Tab): the widget is no longer needed
  win.on('focus', () => hideWidget());
  win.on('maximize', () => { wasMaximizedBeforeMinimize = true; });
  win.on('unmaximize', () => { if (!win?.isMinimized()) wasMaximizedBeforeMinimize = false; });

  win.on('maximize', sendWindowState);
  win.on('unmaximize', sendWindowState);
  win.on('resize', () => { sendWindowState(); if (isMiniPlayerMode()) applyMiniShape(); });
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
// Set full screen explicitly; returns the previous state so callers can restore it
ipcMain.handle('window:setFullScreen', (_event, full: boolean) => {
  if (!win) return false;
  const wasFull = win.isFullScreen();
  if (wasFull !== full) win.setFullScreen(full);
  return wasFull;
});

// ─── Ambient mode ──────────────────────────────────────────────────────────
// Keep the display awake while ambient mode shows playing music
let awakeBlocker: number | null = null;
ipcMain.handle('ambient:keepAwake', (_event, on: boolean) => {
  if (on && awakeBlocker === null) {
    awakeBlocker = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!on && awakeBlocker !== null) {
    powerSaveBlocker.stop(awakeBlocker);
    awakeBlocker = null;
  }
  return on;
});

// System-wide inactivity (keyboard/mouse anywhere), polled cheaply every 15 s.
// Fires 'ambient:idle' once per idle period once the threshold is reached.
let ambientIdleMinutes = 0;
let ambientIdleFired = false;
setInterval(() => {
  if (!ambientIdleMinutes || !win || !win.isVisible() || win.isMinimized()) return;
  const idleSeconds = powerMonitor.getSystemIdleTime();
  if (idleSeconds < 30) ambientIdleFired = false;
  if (!ambientIdleFired && idleSeconds >= ambientIdleMinutes * 60) {
    ambientIdleFired = true;
    win.webContents.send('ambient:idle');
  }
}, 15_000);
ipcMain.handle('ambient:setIdleMinutes', (_event, minutes: number) => {
  ambientIdleMinutes = Math.max(0, Number(minutes) || 0);
  ambientIdleFired = false;
  return ambientIdleMinutes;
});

ipcMain.handle('window:toggleAlwaysOnTop', (_event, alwaysOnTop: boolean) => {
  if (win) win.setAlwaysOnTop(alwaysOnTop);
});

// Mini player mode
ipcMain.handle('window:miniPlayer', () => {
  if (!win) return;
  windowModeChangeAt = Date.now();
  win.unmaximize();
  win.setMaximizable(false);
  win.setMinimumSize(380, 712);
  win.setSize(380, 712);
  win.setAlwaysOnTop(true);
  win.setResizable(false);

  // Position bottom-right of the display the window is on (not always the primary one)
  const { workArea } = screen.getDisplayMatching(win.getBounds());
  win.setPosition(workArea.x + workArea.width - 420, workArea.y + workArea.height - 752);
  applyMiniShape();
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
  windowModeChangeAt = Date.now();
  // Clear the rounded mini shape first: left on a large window it clipped it to 380×712
  if (process.platform !== 'darwin') win.setShape([]);
  win.setAspectRatio(0); // Remove aspect ratio lock
  win.setAlwaysOnTop(false);
  win.setResizable(true);
  win.setMaximizable(true);
  // Grow to a normal size on the same display before maximizing: jumping straight from the
  // 380×712 mini window to maximized is what some Wayland compositors mishandled
  const { workArea } = screen.getDisplayMatching(win.getBounds());
  const width = Math.min(1200, workArea.width), height = Math.min(800, workArea.height);
  win.setMinimumSize(width, height);
  win.setBounds({ x: workArea.x + Math.round((workArea.width - width) / 2), y: workArea.y + Math.round((workArea.height - height) / 2), width, height });
  win.maximize();
  showMainWindow(); // also recovers the window if the compositor minimized it meanwhile
  sendWindowState();
});

ipcMain.handle('window:isMiniPlayer', () => isMiniPlayerMode());

// ─── Floating video ───────────────────────────────────────────────────────
// A small always-on-top window that plays the music video while you use other apps.
interface FloatingVideoPayload { url: string; time: number; title: string; artist: string; subtitle?: { vtt: string; lang: string } | null }
let videoWin: BrowserWindow | null = null;
let videoPayload: FloatingVideoPayload | null = null;
let videoReturnSent = false;

function closeFloatingVideo(returnToApp: { time: number; playing: boolean } | null) {
  if (returnToApp && !videoReturnSent) win?.webContents.send('video:returned', returnToApp);
  videoReturnSent = true; // null = closed by the app (track changed): don't hand playback back
  if (videoWin && !videoWin.isDestroyed()) videoWin.destroy();
  videoWin = null;
}

ipcMain.handle('video:popout', (_event, payload: FloatingVideoPayload) => {
  videoPayload = payload;
  videoReturnSent = false;
  if (videoWin && !videoWin.isDestroyed()) {
    videoWin.webContents.send('video:payload', payload);
    videoWin.showInactive();
    return true;
  }
  const { workArea } = screen.getDisplayMatching(win?.getBounds() ?? screen.getPrimaryDisplay().bounds);
  const width = 480, height = 270;
  videoWin = new BrowserWindow({
    width, height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + workArea.height - height - 24,
    minWidth: 280, minHeight: 158,
    frame: false,
    show: false,
    backgroundColor: '#000000',
    alwaysOnTop: true,
    skipTaskbar: false,
    fullscreenable: true,
    title: payload.title,
    icon: getIconPath(),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  videoWin.setAspectRatio(16 / 9);
  videoWin.once('ready-to-show', () => {
    videoWin?.show();
    if (videoWin) applyAlwaysOnTop(videoWin, true); // re-apply after mapping (Linux)
  });
  videoWin.on('closed', () => {
    // Closed from the OS (Alt+F4 etc.): hand playback back to the app at the last known time
    if (!videoReturnSent) win?.webContents.send('video:returned', { time: lastVideoTime, playing: true });
    videoReturnSent = true;
    videoWin = null;
    import('./services/videoProxy').then(m => m.stopStream()).catch(() => { /* ignore */ });
  });
  loadRoute(videoWin, '/video');
  return true;
});
let lastVideoTime = 0;
ipcMain.handle('video:getPayload', () => videoPayload);
ipcMain.on('video:time', (_event, time: number) => { lastVideoTime = time; });
ipcMain.handle('video:return', (_event, state: { time: number; playing: boolean }) => {
  closeFloatingVideo(state);
  showMainWindow();
});
ipcMain.handle('video:close', (_event, state: { time: number; playing: boolean } | null) => closeFloatingVideo(state));
ipcMain.handle('video:setAlwaysOnTop', (_event, onTop: boolean) => {
  if (videoWin) applyAlwaysOnTop(videoWin, onTop);
  return onTop;
});
ipcMain.handle('video:toggleFullScreen', () => {
  if (!videoWin) return false;
  videoWin.setFullScreen(!videoWin.isFullScreen());
  return videoWin.isFullScreen();
});

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
ipcMain.handle('app:relaunch', () => {
  isQuitting = true;
  app.relaunch();
  app.exit(0);
});

// Tool status for Settings → System
ipcMain.handle('system:info', async () => {
  const { execFile } = await import('node:child_process');
  const { ytDlpBinaryPath } = await import('./utils/ytdlp-bin');
  const { ffmpegBinaryPath, isFFmpegInstalled } = await import('./utils/ffmpeg-bin');
  const version = (bin: string, args: string[]) => new Promise<string | null>((resolve) => {
    execFile(bin, args, { timeout: 8000 }, (err, stdout) => resolve(err ? null : stdout.split('\n')[0].trim()));
  });
  const ytVersion = await version(ytDlpBinaryPath, ['--version']);
  const ffOk = isFFmpegInstalled();
  const ffVersion = ffOk ? await version(ffmpegBinaryPath, ['-version']) : null;
  return {
    ytdlp: { version: ytVersion, bundled: ytDlpBinaryPath.startsWith(process.resourcesPath || '\0') },
    ffmpeg: { version: ffVersion?.replace(/^ffmpeg version\s+/, '').split(' ')[0] ?? null },
    platform: process.platform,
  };
});

// Phone remote (LAN web page, token-protected)
function remoteToken() {
  let t = getSetting('remote_token');
  if (!t) { t = newRemoteToken(); setSetting('remote_token', t); }
  return t;
}

async function startPhoneRemote() {
  return startRemote({
    getState: () => lastPlayerState ?? { hasTrack: false },
    command: (cmd) => win?.webContents.send('player:command', cmd),
    artwork: () => {
      const art = (lastPlayerState as { artwork?: string } | null)?.artwork || '';
      return art.startsWith('atmusic://') ? resolveProtocolPath(art) : art;
    },
    search: async (q) => {
      const term = `%${q}%`;
      const local = getDB().prepare('SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? LIMIT 8').all(term, term, term);
      let online: unknown[] = [];
      try { online = (await searchYouTube(q)).slice(0, 12); } catch { /* offline */ }
      return [...local, ...online];
    },
  }, remoteToken(), parseInt(getSetting('remote_port') || '7777', 10) || 7777);
}

ipcMain.handle('remote:status', () => ({ enabled: getSetting('remote_enabled') === 'true', ...remoteStatus() }));
ipcMain.handle('remote:setEnabled', async (_event, enabled: boolean) => {
  setSetting('remote_enabled', String(!!enabled));
  if (enabled) {
    try { await startPhoneRemote(); } catch (err) { console.error('Phone remote failed to start', err); }
  } else stopRemote();
  return { enabled: !!enabled, ...remoteStatus() };
});
ipcMain.handle('remote:resetLink', async () => {
  setSetting('remote_token', newRemoteToken());
  if (getSetting('remote_enabled') === 'true') await startPhoneRemote();
  return { enabled: getSetting('remote_enabled') === 'true', ...remoteStatus() };
});

app.on('before-quit', () => {
  isQuitting = true;
  stopRemote();
  stopSocial();
  widgetWin?.destroy();
  videoWin?.destroy();
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
  if (getSetting('remote_enabled') === 'true') startPhoneRemote().catch(err => console.error('Phone remote failed to start', err));
});
