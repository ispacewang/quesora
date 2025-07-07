// main.js (在项目根目录) - 已修复版本

const { app, BrowserWindow, ipcMain } = require('electron');
const path =require('path');
// 你的 backend/app.js 现在导出了 createServer 函数
const createServer = require('./backend/app.js'); 

// 定义一个端口号，方便管理
const PORT = 3002;

function createWindow () {
  const win = new BrowserWindow({
    width: 1450,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') 
    }
  });
  win.setMenu(null);

  // 判断开发环境，优先用环境变量，其次用端口检测
  const isDev = process.env.NODE_ENV === 'development' || process.argv.some(arg => arg.includes('--dev'));

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // 开发环境自动打开调试工具
  } else {
    win.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
    // win.webContents.openDevTools(); // 如需生产环境也打开可取消注释
  }
}

// 修改应用的启动流程
app.whenReady().then(() => {
  // 1. 创建 Express 应用实例
  const expressApp = createServer();

  // 2. 启动服务器并监听端口
  expressApp.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
    
    // 3. 在服务器成功启动后，再创建应用窗口
    //    这样可以确保前端加载时，后端 API 已经可用
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

