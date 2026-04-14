/**
 * 登录/注册弹窗
 */
import React, { useState } from 'react';
import { login, register, getCurrentUser, logout } from '../services/authService';
import { SubscriptionPanel } from './SubscriptionPanel';
import { t } from '../i18n';
import { X } from 'lucide-react';

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
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  
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
      setError(t('authPasswordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('authPasswordMinLength'));
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
        setError(response.message || t('authOperationFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('authNetworkError'));
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-neutral-800">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">
              {user ? t('authTitleUserCenter') : mode === 'login' ? t('authTitleLogin') : t('authTitleRegister')}
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              {user
                ? t('authWelcomeBack').replace('{name}', user.username)
                : mode === 'login'
                  ? t('authLoginSubtitle')
                  : t('authRegisterSubtitle')}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center"
            title={t('cancel')}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Menu (if logged in) */}
        {user && (
          <div className="p-6 space-y-4">
            {/* User Info */}
            <div className="bg-black/30 border border-neutral-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{user.username}</div>
                  <div className="text-neutral-500 text-sm">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">{t('authCreditsBalance')}</span>
                <span className="text-white font-semibold text-lg">{user.balance.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-xs px-2 py-1 rounded bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 inline-block">
                {user.subscription_type === 'free' ? t('authSubscriptionFree') :
                 user.subscription_type === 'basic' ? t('authSubscriptionBasic') :
                 user.subscription_type === 'pro' ? t('authSubscriptionPro') : t('authSubscriptionEnterprise')}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => setIsSubscriptionOpen(true)}
                className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-medium transition-colors"
              >
                {t('authSubscriptionAndCredits')}
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => { onClose(); onOpenAdmin?.(); }}
                  className="w-full py-2.5 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 font-medium transition-colors"
                >
                  {t('authAdminPanel')}
                </button>
              )}
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                  window.location.reload();
                }}
                className="w-full py-2.5 rounded-lg border border-neutral-800 bg-black/30 text-red-300 hover:bg-red-500/10 font-medium transition-colors"
              >
                {t('authLogout')}
              </button>
            </div>
          </div>
        )}

        {!user && (
        <>
        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-6 space-y-4">
          <div>
            <label className="block text-neutral-500 text-xs mb-1">{t('authUsername')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/30 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={t('authUsernamePlaceholder')}
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-neutral-500 text-xs mb-1">{t('authEmail')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/30 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder={t('authEmailPlaceholder')}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-neutral-500 text-xs mb-1">{t('authPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={t('authPasswordPlaceholder')}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-neutral-500 text-xs mb-1">{t('authConfirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/30 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-200 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder={t('authConfirmPasswordPlaceholder')}
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-2.5 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('processing')}
              </span>
            ) : (
              mode === 'login' ? t('authTitleLogin') : t('authTitleRegister')
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="px-6 pb-6 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            {mode === 'login' 
              ? t('authSwitchToRegister') 
              : t('authSwitchToLogin')}
          </button>
        </div>
        </>
        )}
      </div>
      {isSubscriptionOpen && (
        <SubscriptionPanel onClose={() => setIsSubscriptionOpen(false)} />
      )}
    </div>
  );
}
