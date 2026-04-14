import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Folder,
  Image as ImageIcon,
  MessageSquare,
  History,
  Wrench,
  MoreHorizontal,
  Plus,
  Film,
  Users,
  User,
  Bell,
  Home,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { t } from '../i18n';

// ============================================================================
// TIKTOK ICON COMPONENT
// ============================================================================

const TikTokIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface ToolbarProps {
  onAddClick?: (e: React.MouseEvent) => void;
  onWorkflowsClick?: (e: React.MouseEvent) => void;
  onProjectsClick?: (e: React.MouseEvent) => void;
  onHistoryClick?: (e: React.MouseEvent) => void;
  onAssetsClick?: (e: React.MouseEvent) => void;
  onTikTokClick?: (e: React.MouseEvent) => void;
  onStoryboardClick?: (e: React.MouseEvent) => void;
  onCollaborationClick?: (e: React.MouseEvent) => void;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
  onOpenAccount?: () => void;
  onOpenTutorial?: () => void;
  onLogout?: () => void;
  user?: { username: string; email?: string; role?: string; balance?: number; subscription_type?: string } | null;
  onToolsOpen?: () => void; // Called when tools dropdown opens to close other panels
  canvasTheme?: 'dark' | 'light';
  onlineUsersCount?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddClick,
  onWorkflowsClick,
  onProjectsClick,
  onHistoryClick,
  onAssetsClick,
  onTikTokClick,
  onStoryboardClick,
  onCollaborationClick,
  onOpenAuth,
  onOpenAdmin,
  onOpenAccount,
  onOpenTutorial,
  onLogout,
  user,
  onToolsOpen,
  canvasTheme = 'dark',
  onlineUsersCount = 0
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isToolsOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen, isUserMenuOpen]);

  const handleToolClick = (callback?: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    setIsToolsOpen(false);
    callback?.(e);
  };

  // Theme-aware styles
  const isDark = canvasTheme === 'dark';

  return (
    <div className={`fixed left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-1 rounded-full shadow-2xl z-50 transition-colors duration-300 ${isDark ? 'bg-[#1a1a1a] border border-neutral-800' : 'bg-white/90 backdrop-blur-sm border border-neutral-200'
      }`}>
      <button
        className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200 mb-2 ${isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-700'
          }`}
        onClick={onAddClick}
      >
        <Plus size={20} />
      </button>

      <div className="flex flex-col gap-4 py-2 px-1">
        {/*
        <button
          className={`hover:scale-125 transition-all duration-200 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          onClick={onWorkflowsClick}
          title={t('myWorkflowsTitle')}
        >
          <LayoutGrid size={20} />
        </button>
        */}
        <button
          className={`hover:scale-125 transition-all duration-200 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          onClick={onProjectsClick}
          title={t('projects')}
        >
          <Folder size={20} />
        </button>
        {/*
		<button
          className={`hover:scale-125 transition-all duration-200 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          title={t('assets')}
          onClick={onAssetsClick}
        >
          <ImageIcon size={20} />
        </button>
        <button
          className={`hover:scale-125 transition-all duration-200 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          onClick={onHistoryClick}
          title={t('history')}
        >
          <History size={20} />
        </button>
*/}
        {/* Collaboration Button */}
        <button
          className={`hover:scale-125 transition-all duration-200 relative ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          onClick={onCollaborationClick}
          title={t('collaboration')}
        >
          <Users size={20} />
          {onlineUsersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
              {onlineUsersCount}
            </span>
          )}
        </button>

        {/* Tools Dropdown
        <div className="relative" ref={toolsRef}>
          <button
            className={`hover:scale-125 transition-all duration-200 ${isDark
              ? `text-neutral-400 hover:text-white ${isToolsOpen ? 'text-white' : ''}`
              : `text-neutral-500 hover:text-neutral-900 ${isToolsOpen ? 'text-neutral-900' : ''}`
              }`}
            onClick={() => {
              if (!isToolsOpen) {
                onToolsOpen?.(); // Close other panels when opening tools
              }
              setIsToolsOpen(!isToolsOpen);
            }}
            title={t('tools')}
          >
            <Wrench size={20} />
          </button>

         
          {isToolsOpen && (
            <div className={`absolute left-10 top-0 rounded-lg shadow-2xl py-2 min-w-[240px] z-50 ${isDark ? 'bg-[#1a1a1a] border border-neutral-700' : 'bg-white border border-neutral-200'
              }`}>
              <button
                onClick={handleToolClick(onTikTokClick)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors group ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                  <TikTokIcon size={16} className={isDark ? 'text-white' : 'text-neutral-700'} />
                </div>
                <div className="text-left">
                  <p className={`text-sm ${isDark ? 'text-neutral-200 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>{t('importTikTok')}</p>
                  <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{t('downloadWithoutWatermark')}</p>
                </div>
              </button>

              <button
                onClick={handleToolClick(onStoryboardClick)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors group ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                  <Film size={16} className={isDark ? 'text-white' : 'text-neutral-700'} />
                </div>
                <div className="text-left">
                  <p className={`text-sm ${isDark ? 'text-neutral-200 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>{t('storyboardGenerator')}</p>
                  <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{t('createScenesWithAI')}</p>
                </div>
              </button>
            </div>
          )}
        </div>
		 */}
      </div>

      <div className={`w-8 h-[1px] my-1 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>

      <div className="relative" ref={userMenuRef}>
        <button
          className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 hover:scale-110 transition-all duration-200 ${isDark ? 'border border-neutral-700 text-neutral-200 hover:text-white' : 'border border-neutral-300 text-neutral-700 hover:text-neutral-900'
            }`}
          onClick={() => {
            setIsToolsOpen(false);
            setIsUserMenuOpen((v) => {
              const next = !v;
              return next;
            });
          }}
          title={user ? user.username : '登录'}
        >
          {user ? (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
          ) : (
            <User size={18} />
          )}
        </button>

        {isUserMenuOpen && (
          <div
            className={`absolute left-12 bottom-0 w-[320px] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-[#1a1a1a] border-neutral-800' : 'bg-white border-neutral-200'}`}
          >
            {!user && (
              <div className="p-4">
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'}`}
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenAuth?.();
                  }}
                >
                  登录 / 注册
                </button>
              </div>
            )}

            {user && (
              <>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-lg font-semibold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{user.username}</div>
                      <div className={`text-sm truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{user.email || ''}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>积分余额</div>
                    <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{typeof user.balance === 'number' ? user.balance.toLocaleString() : '-'}</div>
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      {user.subscription_type || 'free'}
                    </span>
                    {user.role === 'admin' && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">Admin</span>
                    )}
                  </div>
                </div>
                <div className={`${isDark ? 'border-t border-neutral-800' : 'border-t border-neutral-200'}`}></div>
                <div className="p-2">
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      <Bell size={18} />
                    </span>
                    <span className="text-base font-medium">我的通知</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      <Home size={18} />
                    </span>
                    <span className="text-base font-medium">个人主页</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAccount?.();
                    }}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      <Settings size={18} />
                    </span>
                    <span className="text-base font-medium">账户管理</span>
                  </button>
                  {user.role === 'admin' && (
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAdmin?.();
                      }}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                        <Settings size={18} />
                      </span>
                      <span className="text-base font-medium">管理后台</span>
                    </button>
                  )}
                </div>
                <div className={`${isDark ? 'border-t border-neutral-800' : 'border-t border-neutral-200'}`}></div>
                <div className="p-2">
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenTutorial?.();
                    }}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      <HelpCircle size={18} />
                    </span>
                    <span className="text-base font-medium">使用教程</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                      <LogOut size={18} />
                    </span>
                    <span className="text-base font-medium">登出账号</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
