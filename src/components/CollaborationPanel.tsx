/**
 * 协作面板组件
 * 显示在线用户、光标位置、实时更新
 */
import React, { useState, useEffect, useRef } from 'react';
import { collaborationService, CollaborationUser, ChatMessage } from '../services/socketService';
import { t } from '../i18n';
import { Check, Copy, Send, Share2, Users, MessageSquare, Link as LinkIcon, X } from 'lucide-react';

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
      addSystemMessage(t('collaborationUserJoined').replace('{name}', data.username));
    };

    // 监听用户离开
    const handleUserLeft = (data: CollaborationUser) => {
      setUsers(prev => prev.filter(u => u.userId !== data.userId));
      addSystemMessage(t('collaborationUserLeft').replace('{name}', data.username));
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

  const roleLabel = (role?: string) => {
    if (role === 'owner') return t('collaborationRoleOwner');
    if (role === 'editor') return t('collaborationRoleEditor');
    if (role === 'viewer') return t('collaborationRoleViewer');
    return t('collaborationRoleMember');
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
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-8 rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#111] to-[#0b0b0b] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <div className="text-2xl font-semibold text-white">{t('collaborationTitle')}</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center"
            title={t('cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-8">
          <div className="inline-flex rounded-xl border border-neutral-800 bg-black/30 p-1">
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} />
              <span>{t('collaborationTabUsers')} ({users.length})</span>
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>{t('collaborationTabChat')}</span>
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'invite' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
              onClick={() => { setActiveTab('invite'); generateInviteLink(); }}
            >
              <LinkIcon size={16} />
              <span>{t('collaborationTabInvite')}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-10 pt-6">
        {activeTab === 'users' && (
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-black/30 p-8 text-center text-neutral-500 text-sm">
                {t('collaborationNoOtherUsers')}
              </div>
            ) : (
              users.map(user => (
                <div key={user.userId} className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-800 bg-black/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{user.username}</div>
                    <div className={`text-xs ${getRoleColor(user.role)}`}>{roleLabel(user.role)}</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3 rounded-2xl border border-neutral-800 bg-black/30 p-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.userId === 'system' ? 'justify-center' : ''}`}>
                  {msg.userId === 'system' ? (
                    <span className="text-xs text-neutral-500 italic">{msg.message}</span>
                  ) : (
                    <div className="max-w-[85%]">
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium text-sm text-blue-300">{msg.username}</span>
                        <span className="text-xs text-neutral-600">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-200 bg-white/5 border border-neutral-800 rounded-lg px-3 py-2">
                        {msg.message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('collaborationTypeMessage')}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-sm font-medium flex items-center gap-2"
                >
                  <Send size={16} />
                  {t('collaborationSend')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="space-y-6">
            <div>
              <div className="text-lg font-semibold text-white">{t('collaborationInviteTitle')}</div>
              <div className="mt-2 text-sm text-neutral-500">{t('collaborationInviteDesc')}</div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 mb-2">{t('collaborationPermissionLevel')}</div>
              <div className="inline-flex rounded-xl border border-neutral-800 bg-black/30 p-1">
                <button
                  onClick={() => setInviteRole('editor')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${inviteRole === 'editor' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {t('collaborationRoleEditor')}
                </button>
                <button
                  onClick={() => setInviteRole('viewer')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${inviteRole === 'viewer' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {t('collaborationRoleViewer')}
                </button>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                {inviteRole === 'editor' ? t('collaborationEditorDesc') : t('collaborationViewerDesc')}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 mb-2">{t('collaborationInviteLink')}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  placeholder={t('collaborationGenerateLink')}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500 text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    copied ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('collaborationCopied') : t('collaborationCopy')}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={shareInvite}
                className="flex-1 px-4 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Share2 size={16} />
                {t('collaborationShare')}
              </button>
            </div>

            <div className="border-t border-neutral-800 pt-4">
              <div className="text-xs text-neutral-500 text-center">
                {t('collaborationAnyoneCanJoinAs').replace('{role}', inviteRole === 'editor' ? t('collaborationRoleEditor') : t('collaborationRoleViewer'))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default CollaborationPanel;
