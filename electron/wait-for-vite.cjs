/**
 * 等待 Vite 开发服务器启动后再启动 Electron
 */

import http from 'http';

const PORT = 5173;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

function checkServer(retries = 0) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PORT}`, (res) => {
            console.log(`Vite server is ready!`);
            resolve();
        });
        
        req.on('error', () => {
            if (retries < MAX_RETRIES) {
                console.log(`Waiting for Vite server... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => {
                    checkServer(retries + 1).then(resolve).catch(reject);
                }, RETRY_INTERVAL);
            } else {
                reject(new Error('Vite server failed to start'));
            }
        });
        
        req.end();
    });
}

console.log('Checking Vite server...');
checkServer()
    .then(() => {
        console.log('Starting Electron...');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
