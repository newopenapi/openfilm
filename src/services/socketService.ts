/**
 * Socket.io 协作服务
 * 实时协作功能前端集成
 */
import { io, Socket } from 'socket.io-client';
import { getToken } from './authService';

class CollaborationService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private projectId: string | null = null;

  /**
   * 连接 Socket.io 服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        if (this.socket.connected) {
          resolve();
          return;
        }
        const onConnect = () => {
          this.socket?.off('connect_error', onError);
          resolve();
        };
        const onError = (error: any) => {
          this.socket?.off('connect', onConnect);
          reject(error);
        };
        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);
        this.socket.connect();
        return;
      }

      const token = getToken();
      if (!token) {
        reject(new Error('No auth token available'));
        return;
      }

      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.socket.on('connect', () => {
        console.log('[Socket.IO] Connected to server');
        this.reconnectAttempts = 0;
        this.emit('connected', null);
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket.IO] Disconnected:', reason);
        this.emit('disconnected', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket.IO] Connection error:', error.message);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('connectionFailed', error.message);
        }
        reject(error);
      });

      // 用户事件
      this.socket.on('user:online', (data) => this.emit('userOnline', data));
      this.socket.on('user:offline', (data) => this.emit('userOffline', data));

      // 项目事件
      this.socket.on('user:joined', (data) => this.emit('userJoined', data));
      this.socket.on('user:left', (data) => this.emit('userLeft', data));
      this.socket.on('project:users', (data) => this.emit('projectUsers', data));

      // 节点操作事件
      this.socket.on('node:updated', (data) => this.emit('nodeUpdated', data));
      this.socket.on('node:added', (data) => this.emit('nodeAdded', data));
      this.socket.on('node:deleted', (data) => this.emit('nodeDeleted', data));

      // 连线操作事件
      this.socket.on('connection:added', (data) => this.emit('connectionAdded', data));
      this.socket.on('connection:deleted', (data) => this.emit('connectionDeleted', data));

      // 光标和选择事件
      this.socket.on('cursor:moved', (data) => this.emit('cursorMoved', data));
      this.socket.on('selection:changed', (data) => this.emit('selectionChanged', data));

      // 聊天事件
      this.socket.on('chat:message', (data) => this.emit('chatMessage', data));

      // 错误事件
      this.socket.on('error', (data) => {
        console.error('[Socket.IO] Error:', data.message);
        this.emit('error', data);
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      if (this.projectId) {
        this.leaveProject(this.projectId);
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 加入项目
   */
  joinProject(projectId: string) {
    if (!this.socket?.connected) {
      console.warn('[Socket.IO] Not connected');
      return;
    }
    this.projectId = projectId;
    this.socket.emit('project:join', projectId);
  }

  /**
   * 离开项目
   */
  leaveProject(projectId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('project:leave', projectId);
    this.projectId = null;
  }

  /**
   * 发送节点更新
   */
  updateNode(projectId: string, nodeId: string, changes: Record<string, any>) {
    if (!this.socket?.connected) return;
    this.socket.emit('node:update', { projectId, nodeId, changes });
  }

  /**
   * 添加节点
   */
  addNode(projectId: string, node: any) {
    if (!this.socket?.connected) return;
    this.socket.emit('node:add', { projectId, node });
  }

  /**
   * 删除节点
   */
  deleteNode(projectId: string, nodeId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('node:delete', { projectId, nodeId });
  }

  /**
   * 添加连线
   */
  addConnection(projectId: string, connection: any) {
    if (!this.socket?.connected) return;
    this.socket.emit('connection:add', { projectId, connection });
  }

  /**
   * 删除连线
   */
  deleteConnection(projectId: string, connectionId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('connection:delete', { projectId, connectionId });
  }

  /**
   * 移动光标
   */
  moveCursor(projectId: string, position: { x: number; y: number }) {
    if (!this.socket?.connected) return;
    this.socket.emit('cursor:move', { projectId, position });
  }

  /**
   * 变更选择
   */
  changeSelection(projectId: string, selectedNodeIds: string[]) {
    if (!this.socket?.connected) return;
    this.socket.emit('selection:change', { projectId, selectedNodeIds });
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(projectId: string, message: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('chat:message', { projectId, message });
  }

  /**
   * 订阅事件
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 取消订阅
   */
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket.IO] Event handler error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 检查是否连接
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 获取当前项目ID
   */
  getCurrentProjectId(): string | null {
    return this.projectId;
  }
}

// 导出单例
export const collaborationService = new CollaborationService();

// 导出类型
export interface CollaborationUser {
  userId: string;
  username: string;
  role?: 'owner' | 'editor' | 'viewer';
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface NodeChange {
  userId: string;
  username: string;
  nodeId: string;
  changes: Record<string, any>;
}
