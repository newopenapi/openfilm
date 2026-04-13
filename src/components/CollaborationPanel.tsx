/**
 * 协作面板组件
 * 显示在线用户、光标位置、实时更新
 */
import React, { useState, useEffect, useRef } from 'react';
import { collaborationService, CollaborationUser, ChatMessage } from '../services/socketService';

interface CollaborationPanelProps {
  projectId: string;
  onClose?: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ projectId, onClose }) => {
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'invite'>('users');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 连接并加入项目
    collaborationService.connect().then(() => {
      collaborationService.joinProject(projectId);
    }).catch(err => {
      console.error('Failed to connect:', err);
    });

    // 监听用户列表更新
    const handleUsersUpdate = (userList: CollaborationUser[]) => {
      setUsers(userList);
    };

    // 监听用户加入
    const handleUserJoined = (data: CollaborationUser) => {
      setUsers(prev => {
        if (prev.find(u => u.userId === data.userId)) {
          return prev;
        }
        return [...prev, data];
      });
      addSystemMessage(`${data.username} joined the project`);
    };

    // 监听用户离开
    const handleUserLeft = (data: CollaborationUser) => {
      setUsers(prev => prev.filter(u => u.userId !== data.userId));
      addSystemMessage(`${data.username} left the project`);
    };

    // 监听聊天消息
    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    collaborationService.on('projectUsers', handleUsersUpdate);
    collaborationService.on('userJoined', handleUserJoined);
    collaborationService.on('userLeft', handleUserLeft);
    collaborationService.on('chatMessage', handleChatMessage);

    return () => {
      collaborationService.leaveProject(projectId);
      collaborationService.off('projectUsers', handleUsersUpdate);
      collaborationService.off('userJoined', handleUserJoined);
      collaborationService.off('userLeft', handleUserLeft);
      collaborationService.off('chatMessage', handleChatMessage);
    };
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      userId: 'system',
      username: 'System',
      message: text,
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    collaborationService.sendChatMessage(projectId, newMessage.trim());
    setNewMessage('');
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-500';
      case 'editor': return 'text-blue-500';
      case 'viewer': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  // 生成邀请链接
  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const token = btoa(`${projectId}:${inviteRole}:${Date.now()}`);
    const link = `${baseUrl}?invite=${token}`;
    setInviteLink(link);
  };

  // 复制邀请链接
  const copyInviteLink = async () => {
    if (!inviteLink) {
      generateInviteLink();
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 分享到其他应用
  const shareInvite = async () => {
    if (!inviteLink) {
      generateInviteLink();
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my project',
          text: 'Click the link to join my project and collaborate',
          url: inviteLink
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyInviteLink();
    }
  };

  return (
    <div className="fixed right-4 top-20 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 flex flex-col max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-white">Collaboration</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'invite' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => { setActiveTab('invite'); generateInviteLink(); }}
        >
          Invite
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'users' && (
          <div className="p-3 space-y-2">
            {users.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No other users online</p>
            ) : (
              users.map(user => (
                <div key={user.userId} className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-700">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 dark:text-white">{user.username}</p>
                    <p className={`text-xs ${getRoleColor(user.role)}`}>{user.role || 'member'}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.userId === 'system' ? 'justify-center' : ''}`}>
                  {msg.userId === 'system' ? (
                    <span className="text-xs text-gray-400 italic">{msg.message}</span>
                  ) : (
                    <div className="max-w-[85%]">
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium text-sm text-blue-600">{msg.username}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                        {msg.message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-white mb-2">Invite Collaborators</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share this link to invite others to collaborate on this project.
              </p>
            </div>

            {/* Permission Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permission Level
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteRole('editor')}
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    inviteRole === 'editor'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setInviteRole('viewer')}
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    inviteRole === 'viewer'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Viewer
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {inviteRole === 'editor' 
                  ? 'Can edit nodes, add connections, and chat'
                  : 'Can view the project and chat only'}
              </p>
            </div>

            {/* Invite Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invite Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  placeholder="Click to generate link..."
                  className="flex-1 px-3 py-2 text-sm border rounded bg-gray-50 dark:bg-gray-700 truncate"
                />
                <button
                  onClick={copyInviteLink}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="flex gap-2">
              <button
                onClick={shareInvite}
                className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>

            {/* QR Code hint */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Anyone with this link can join as <strong>{inviteRole}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPanel;
