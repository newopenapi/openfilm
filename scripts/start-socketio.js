/**
 * Socket.io 服务器启动脚本
 * 使用方法: node scripts/start-socketio.js
 */
require('dotenv').config();
const http = require('http');
const { initSocketIO } = require('../server/services/socketio.cjs');

const PORT = process.env.SOCKET_PORT || 3002;

const server = http.createServer();
const io = initSocketIO(server);

server.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`);
  console.log('[Socket.IO] Real-time collaboration enabled');
});
