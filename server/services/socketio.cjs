/**
 * Socket.io 服务
 * 实时协作功能
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Project, Collaborator } = require('../models/index.cjs');

// 在线用户映射
const onlineUsers = new Map(); // userId -> Set<socketId>
const userSockets = new Map();  // socketId -> { userId, projectId }

function initSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'username', 'email', 'role']
      });

      if (!user) {
        return next(new Error('用户不存在'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  // 连接处理
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`[Socket.IO] User ${socket.user.username} (${userId}) connected`);

    // 添加到在线用户列表
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    userSockets.set(socket.id, { userId, username: socket.user.username });

    // 广播用户上线
    io.emit('user:online', { userId, username: socket.user.username });

      // 如果用户在同一浏览器/设备重复连接，只保留最新连接，避免同一用户出现多个在线计数
      const socketSet = onlineUsers.get(userId);
      if (socketSet && socketSet.size > 1) {
        for (const sid of socketSet) {
          if (sid !== socket.id) {
            const s = io.sockets.sockets.get(sid);
            if (s) {
              s.disconnect(true);
            }
          }
        }
      }

    // 加入项目房间
    socket.on('project:join', async (projectId) => {
      try {
        // 检查用户是否有权限访问该项目
        const project = await Project.findByPk(projectId);
        if (!project) {
          socket.emit('error', { message: '项目不存在' });
          return;
        }

        // 项目所有者或协作者可以加入
        const isOwner = project.user_id === userId;
        const collaborator = await Collaborator.findOne({
          where: { project_id: projectId, user_id: userId }
        });

        if (!isOwner && !collaborator) {
          socket.emit('error', { message: '没有权限访问该项目' });
          return;
        }

        // 加入房间
        socket.join(`project:${projectId}`);
        socket.projectId = projectId;
        userSockets.set(socket.id, { ...userSockets.get(socket.id), projectId });

        console.log(`[Socket.IO] User ${socket.user.username} joined project ${projectId}`);

        // 通知房间内其他用户
        socket.to(`project:${projectId}`).emit('user:joined', {
          userId,
          username: socket.user.username,
          role: isOwner ? 'owner' : collaborator?.role
        });

        // 发送当前在线用户列表
        const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
        const onlineUsersInRoom = [];
        if (room) {
          for (const socketId of room) {
            const userInfo = userSockets.get(socketId);
            if (userInfo) {
              onlineUsersInRoom.push({
                userId: userInfo.userId,
                username: userInfo.username
              });
            }
          }
        }
        socket.emit('project:users', onlineUsersInRoom);

      } catch (error) {
        console.error('[Socket.IO] Join project error:', error);
        socket.emit('error', { message: '加入项目失败' });
      }
    });

    // 离开项目房间
    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
      console.log(`[Socket.IO] User ${socket.user.username} left project ${projectId}`);

      // 通知房间内其他用户
      socket.to(`project:${projectId}`).emit('user:left', {
        userId,
        username: socket.user.username
      });
    });

    // 节点操作同步
    socket.on('node:update', (data) => {
      const { projectId, nodeId, changes } = data;
      socket.to(`project:${projectId}`).emit('node:updated', {
        userId,
        username: socket.user.username,
        nodeId,
        changes
      });
    });

    socket.on('node:add', (data) => {
      const { projectId, node } = data;
      socket.to(`project:${projectId}`).emit('node:added', {
        userId,
        username: socket.user.username,
        node
      });
    });

    socket.on('node:delete', (data) => {
      const { projectId, nodeId } = data;
      socket.to(`project:${projectId}`).emit('node:deleted', {
        userId,
        username: socket.user.username,
        nodeId
      });
    });

    // 连线操作同步
    socket.on('connection:add', (data) => {
      const { projectId, connection } = data;
      socket.to(`project:${projectId}`).emit('connection:added', {
        userId,
        username: socket.user.username,
        connection
      });
    });

    socket.on('connection:delete', (data) => {
      const { projectId, connectionId } = data;
      socket.to(`project:${projectId}`).emit('connection:deleted', {
        userId,
        username: socket.user.username,
        connectionId
      });
    });

    // 光标位置同步
    socket.on('cursor:move', (data) => {
      const { projectId, position } = data;
      socket.to(`project:${projectId}`).emit('cursor:moved', {
        userId,
        username: socket.user.username,
        position
      });
    });

    // 选择同步
    socket.on('selection:change', (data) => {
      const { projectId, selectedNodeIds } = data;
      socket.to(`project:${projectId}`).emit('selection:changed', {
        userId,
        username: socket.user.username,
        selectedNodeIds
      });
    });

    // 聊天消息
    socket.on('chat:message', (data) => {
      const { projectId, message } = data;
      io.to(`project:${projectId}`).emit('chat:message', {
        userId,
        username: socket.user.username,
        message,
        timestamp: Date.now()
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${socket.user.username} (${userId}) disconnected`);

      // 从在线用户列表移除
      const userSocketsSet = onlineUsers.get(userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId, username: socket.user.username });
        }
      }

      // 通知离开的项目
      const socketInfo = userSockets.get(socket.id);
      if (socketInfo?.projectId) {
        socket.to(`project:${socketInfo.projectId}`).emit('user:left', {
          userId,
          username: socket.user.username
        });
      }

      userSockets.delete(socket.id);
    });
  });

  return io;
}

// 获取在线用户数
function getOnlineUsersCount() {
  let count = 0;
  for (const sockets of onlineUsers.values()) {
    count += sockets.size;
  }
  return count;
}

module.exports = {
  initSocketIO,
  getOnlineUsersCount,
  onlineUsers
};
