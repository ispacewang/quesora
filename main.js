/** @file main.js — Electron 主进程入口，创建 frameless Mica 窗口，启动 Express 后端（端口13002），IPC 窗口控制 */

const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const createServer = require('./backend/app.js');

const PORT = 13002;
let serverInstance = null;
let mainWindow = null;
let splashWindow = null;
let splashShownAt = 0;
let splashCloseTimer = null;
let ipcRegistered = false;
let updateAvailable = false;
let updateReady = false;
let updateInstalling = false;
let updateState = { status: 'idle' };

const UPDATE_FEED_URL_OVERRIDE = process.env.QUESORA_UPDATE_URL || '';
const SPLASH_MIN_DURATION = 1000;

function isDevelopment() {
  return process.env.NODE_ENV === 'development' || process.argv.some(arg => arg.includes('--dev'));
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 520,
    height: 390,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    center: true,
    backgroundColor: '#fffaf2',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow = splash;
  splashShownAt = Date.now();
  splash.once('ready-to-show', () => splash.showInactive());
  splash.on('closed', () => {
    if (splashWindow === splash) splashWindow = null;
  });
  splash.loadFile(path.join(__dirname, isDevelopment() ? 'frontend/public/splash.html' : 'frontend/dist/splash.html'));
}

function closeSplashWindow() {
  if (splashCloseTimer) return;

  const splash = splashWindow;
  const finish = () => {
    splashCloseTimer = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    if (splash && !splash.isDestroyed()) splash.close();
  };

  if (!splash) {
    finish();
    return;
  }

  const remaining = Math.max(0, SPLASH_MIN_DURATION - (Date.now() - splashShownAt));
  splashCloseTimer = setTimeout(finish, remaining);
}

function sendUpdateState(state) {
  updateState = { ...updateState, ...state };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-state-changed', updateState);
  }
}

function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function normalizeFeedUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * 配置更新源：默认用 package.json build.publish 的 GitHub Releases 配置（构建时写入 app-update.yml，
 * electron-updater 自动读取）；仅当 QUESORA_UPDATE_URL 指定时才改用通用静态源
 */
function applyUpdateFeed() {
  if (!UPDATE_FEED_URL_OVERRIDE) return;
  autoUpdater.setFeedURL({ provider: 'generic', url: normalizeFeedUrl(UPDATE_FEED_URL_OVERRIDE) });
}

function closeBackendServer(done) {
  if (!serverInstance) {
    done();
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    serverInstance = null;
    done();
  };

  serverInstance.close(finish);
  serverInstance.closeAllConnections?.();

  const fallbackTimer = setTimeout(finish, 1500);
  fallbackTimer.unref?.();
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => sendUpdateState({ status: 'checking' }));
  autoUpdater.on('update-available', (info) => {
    updateAvailable = true;
    sendUpdateState({ status: 'available', version: info.version, progress: 0 });
  });
  autoUpdater.on('update-not-available', (info) => {
    updateAvailable = false;
    sendUpdateState({ status: 'not-available', version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateState({
      status: 'downloading',
      progress: Math.round(progress.percent || 0),
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    updateAvailable = false;
    updateReady = true;
    sendUpdateState({ status: 'downloaded', version: info.version, progress: 100 });
  });
  autoUpdater.on('error', (error) => {
    sendUpdateState({ status: 'error', error: error?.message || '检查更新失败' });
  });
}

function checkForUpdates() {
  if (['checking', 'available', 'downloading', 'downloaded', 'installing'].includes(updateState.status)) {
    return;
  }
  if (!app.isPackaged) {
    sendUpdateState({ status: 'disabled', error: '开发模式不检查更新' });
    return;
  }

  sendUpdateState({ status: 'checking' });
  applyUpdateFeed();
  autoUpdater.checkForUpdates().catch((error) => {
    sendUpdateState({ status: 'error', error: error?.message || '检查更新失败' });
  });
}

async function downloadUpdate() {
  if (!updateAvailable || updateReady || ['downloading', 'installing'].includes(updateState.status)) {
    return false;
  }

  sendUpdateState({ status: 'downloading', progress: 0 });
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    sendUpdateState({ status: 'error', error: error?.message || '下载更新失败' });
    return false;
  }
}

function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.on('window-minimize', () => getMainWindow()?.minimize());
  ipcMain.on('window-maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window-close', () => getMainWindow()?.close());
  ipcMain.handle('window-is-maximized', () => getMainWindow()?.isMaximized() || false);
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-update-state', () => updateState);
  ipcMain.handle('check-for-updates', () => {
    checkForUpdates();
    return updateState;
  });
  ipcMain.handle('download-update', () => downloadUpdate());
  ipcMain.handle('restart-and-install-update', () => {
    if (!updateReady || updateInstalling) return false;
    updateInstalling = true;
    sendUpdateState({ status: 'installing' });
    closeBackendServer(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return true;
  });
}

/**
 * 创建主窗口：frameless Mica 窗口，设置 preload、窗口控制 IPC、最大化/还原事件
 */
function createWindow () {
  const win = new BrowserWindow({
    width: 1450,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'frontend/dist/favicon1.ico'),
    backgroundMaterial: 'mica',
    backgroundColor: '#f6f8fb',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow = win;
  win.setMenu(null);

  const isDev = isDevelopment();

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
  }

  // 窗口控制
  win.on('maximize', () => win.webContents.send('window-state-changed', true));
  win.on('unmaximize', () => win.webContents.send('window-state-changed', false));
  win.on('enter-full-screen', () => win.webContents.send('window-state-changed', 'fullscreen'));
  win.on('leave-full-screen', () => win.webContents.send('window-state-changed', false));
  win.once('ready-to-show', closeSplashWindow);
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('update-state-changed', updateState);
    checkForUpdates();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  setupAutoUpdater();
  createSplashWindow();
  const expressApp = createServer(app.getPath('userData'));
  serverInstance = expressApp.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
