/**
 * Electron 主进程
 * 
 * 负责：
 * - 启动 Node.js 后端服务
 * - 管理浏览器窗口
 * - 安全存储 API Key
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// electron-store for secure API key storage
const Store = require('electron-store');

// Initialize store with schema
const store = new Store({
    name: 'openfilm-config',
    encryptionKey: 'openfilm-secure-key-2024',
    schema: {
        apiKeys: {
            type: 'object',
            default: {},
            properties: {
                GEMINI_API_KEY: { type: 'string' },
                KLING_ACCESS_KEY: { type: 'string' },
                KLING_SECRET_KEY: { type: 'string' },
                HAILUO_API_KEY: { type: 'string' },
                OPENAI_API_KEY: { type: 'string' },
                FAL_API_KEY: { type: 'string' },
                VOLCANO_API_KEY: { type: 'string' },
                NANOBANANA_API_KEY: { type: 'string' }
            }
        },
        baseUrls: {
            type: 'object',
            default: {},
            properties: {
                GOOGLE_BASE_URL: { type: 'string' },
                OPENAI_BASE_URL: { type: 'string' },
                KLING_BASE_URL: { type: 'string' },
                HAILUO_BASE_URL: { type: 'string' },
                FAL_BASE_URL: { type: 'string' },
                VOLCANO_BASE_URL: { type: 'string' },
                NANOBANANA_BASE_URL: { type: 'string' }
            }
        },
        firstRun: {
            type: 'boolean',
            default: true
        },
        windowBounds: {
            type: 'object',
            default: { width: 1400, height: 900 }
        }
    }
});

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

// 环境变量
const isDev = !app.isPackaged;
const SERVER_PORT = 3001;
const FRONTEND_PORT = 5173;

function getServerUrl() {
    if (isDev) {
        return `http://localhost:${SERVER_PORT}`;
    }
    return `http://localhost:${SERVER_PORT}`;
}

function getFrontendUrl() {
    if (isDev) {
        return `http://localhost:${FRONTEND_PORT}`;
    }
    // 生产环境使用内置的静态文件服务器
    return `file://${path.join(__dirname, '../dist/index.html')}`;
}

/**
 * 启动后端服务器
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = isDev 
            ? path.join(__dirname, '../server/index.js')
            : path.join(__dirname, '../server/index.js');
        
        const env = {
            ...process.env,
            // 从 electron-store 读取 API Keys
            ...store.get('apiKeys'),
            ...store.get('baseUrls'),
            NODE_ENV: isDev ? 'development' : 'production',
            IS_ELECTRON: 'true',
            APP_DATA_PATH: app.getPath('userData')
        };

        serverProcess = spawn('node', [serverPath], {
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Server]', output);
            // 检测服务器是否启动成功
            if (output.includes('Server running') || output.includes('listening') || output.includes(`:${SERVER_PORT}`)) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('[Server Error]', data.toString());
        });

        serverProcess.on('error', (error) => {
            console.error('Failed to start server:', error);
            reject(error);
        });

        // 超时处理
        setTimeout(() => {
            resolve(); // 即使没检测到启动信息也继续
        }, 5000);
    });
}

/**
 * 创建主窗口
 */
async function createWindow() {
    const bounds = store.get('windowBounds');
    
    mainWindow = new BrowserWindow({
        width: bounds.width || 1400,
        height: bounds.height || 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'OpenFilm',
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false // 等内容加载完成再显示
    });

    // 保存窗口大小
    mainWindow.on('resize', () => {
        if (!mainWindow.isMaximized()) {
            const [width, height] = mainWindow.getSize();
            store.set('windowBounds', { width, height });
        }
    });

    // 窗口准备就绪后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // 加载前端
    const url = isDev ? `http://localhost:${FRONTEND_PORT}` : `file://${path.join(__dirname, '../dist/index.html')}`;
    console.log('Loading:', url);
    await mainWindow.loadURL(url);

    // 处理窗口关闭
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

/**
 * 清理资源
 */
function cleanup() {
    isQuitting = true;
    
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    
    if (mainWindow) {
        mainWindow.destroy();
        mainWindow = null;
    }
}

// IPC 处理器

// 获取 API Keys
ipcMain.handle('get-api-keys', () => {
    return {
        apiKeys: store.get('apiKeys'),
        baseUrls: store.get('baseUrls'),
        firstRun: store.get('firstRun')
    };
});

// 保存 API Keys
ipcMain.handle('save-api-keys', (event, data) => {
    if (data.apiKeys) {
        store.set('apiKeys', data.apiKeys);
    }
    if (data.baseUrls) {
        store.set('baseUrls', data.baseUrls);
    }
    store.set('firstRun', false);
    
    // 重启服务器以应用新的环境变量
    if (serverProcess) {
        serverProcess.kill();
        startServer();
    }
    
    return { success: true };
});

// 导入 .env 文件
ipcMain.handle('import-env-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: '导入 .env 文件',
        filters: [
            { name: 'Environment Files', extensions: ['env'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
    }

    const fs = require('fs');
    const envPath = result.filePaths[0];
    
    try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const envVars = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').trim();
                }
            }
        });

        // 分类存储
        const apiKeys = {};
        const baseUrls = {};
        
        const apiKeyNames = ['GEMINI_API_KEY', 'KLING_ACCESS_KEY', 'KLING_SECRET_KEY', 
                           'HAILUO_API_KEY', 'OPENAI_API_KEY', 'FAL_API_KEY', 
                           'VOLCANO_API_KEY', 'NANOBANANA_API_KEY'];
        const baseUrlNames = ['GOOGLE_BASE_URL', 'OPENAI_BASE_URL', 'KLING_BASE_URL',
                            'HAILUO_BASE_URL', 'FAL_BASE_URL', 'VOLCANO_BASE_URL',
                            'NANOBANANA_BASE_URL'];
        
        Object.entries(envVars).forEach(([key, value]) => {
            if (apiKeyNames.includes(key)) {
                apiKeys[key] = value;
            } else if (baseUrlNames.includes(key)) {
                baseUrls[key] = value;
            }
        });

        return { success: true, apiKeys, baseUrls };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 获取服务器状态
ipcMain.handle('get-server-status', () => {
    return {
        running: serverProcess !== null,
        url: getServerUrl()
    };
});

// 打开外部链接
ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
});

// 打开数据目录
ipcMain.handle('open-data-folder', () => {
    shell.openPath(app.getPath('userData'));
});

// 应用事件
app.whenReady().then(async () => {
    console.log('OpenFilm starting...');
    
    // 启动服务器
    await startServer();
    console.log('Backend server started');
    
    // 创建窗口
    await createWindow();
    console.log('Main window created');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        cleanup();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', cleanup);

// 捕获未处理的错误
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
