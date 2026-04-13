/**
 * 登录/注册弹窗
 */
import React, { useState } from 'react';
import { login, register, getCurrentUser, logout } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAdmin?: () => void;
  initialMode?: AuthMode;
}

type AuthMode = 'login' | 'register';

export function AuthModal({ isOpen, onClose, onSuccess, onOpenAdmin, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(getCurrentUser());
  
  // 表单状态
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6个字符');
      return;
    }

    setLoading(true);
    
    try {
      let response;
      if (mode === 'login') {
        response = await login({ username, password });
      } else {
        response = await register({ username, email, password });
      }

      if (response.success) {
        setUser(getCurrentUser());
        onSuccess();
      } else {
        setError(response.message || '操作失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  const handleClose = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-[#1a1a2e] rounded-xl w-[400px] max-w-[90vw] p-6 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {user ? '用户中心' : mode === 'login' ? '登录' : '注册'}
          </h2>
          <p className="text-gray-400 text-sm">
            {user 
              ? `欢迎回来，${user.username}` 
              : mode === 'login' 
                ? '欢迎回来，请登录您的账号' 
                : '创建新账号开始使用'}
          </p>
        </div>

        {/* User Menu (if logged in) */}
        {user && (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{user.username}</div>
                  <div className="text-gray-400 text-sm">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">积分余额</span>
                <span className="text-blue-400 font-bold text-lg">{user.balance.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-xs px-2 py-1 rounded bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 inline-block">
                {user.subscription_type === 'free' ? '免费版' : 
                 user.subscription_type === 'basic' ? '基础版' : 
                 user.subscription_type === 'pro' ? '专业版' : '企业版'}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {user.role === 'admin' && (
                <button
                  onClick={() => { onClose(); onOpenAdmin?.(); }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  管理后台
                </button>
              )}
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                  window.location.reload();
                }}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-2.5 rounded-lg transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        )}

        {!user && (
        <>
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="请输入用户名"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-gray-300 text-sm mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="请输入邮箱"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-gray-300 text-sm mb-1">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="请再次输入密码"
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                处理中...
              </span>
            ) : (
              mode === 'login' ? '登录' : '注册'
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {mode === 'login' 
              ? '还没有账号？立即注册' 
              : '已有账号？立即登录'}
          </button>
        </div>
        </>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
