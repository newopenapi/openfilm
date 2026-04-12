/**
 * TikTokPostModal.tsx
 * 
 * Modal overlay for posting videos to TikTok.
 * Shows video preview and allows users to compose caption before posting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Send, LogOut } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TikTokPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaUrl: string | null;
}

interface TikTokUser {
    openId: string;
    displayName: string;
    username: string;
    avatarUrl: string;
}

type PostStatus = 'idle' | 'authenticating' | 'posting' | 'success' | 'error';

type PrivacyLevel = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';

// TikTok brand icon SVG
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

// ============================================================================
// SESSION STORAGE KEY
// ============================================================================

const TIKTOK_SESSION_KEY = 'tiktok_session_id';

// Privacy level options
const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; description: string }[] = [
    { value: 'PUBLIC_TO_EVERYONE', label: 'Public', description: 'Everyone can view' },
    { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends', description: 'Mutual followers only' },
    { value: 'FOLLOWER_OF_CREATOR', label: 'Followers', description: 'Your followers only' },
    { value: 'SELF_ONLY', label: 'Only Me', description: 'Private (recommended for testing)' }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const TikTokPostModal: React.FC<TikTokPostModalProps> = ({
    isOpen,
    onClose,
    mediaUrl
}) => {
    // --- State ---
    const [captionText, setCaptionText] = useState('');
    const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('SELF_ONLY');
    const [status, setStatus] = useState<PostStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [user, setUser] = useState<TikTokUser | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Character limit for TikTok captions
    const MAX_CHARS = 2200;
    const charsRemaining = MAX_CHARS - captionText.length;
    const isOverLimit = charsRemaining < 0;

    // --- Effects ---

    // Check auth status when modal opens
    useEffect(() => {
        if (isOpen) {
            // Load session from localStorage
            const storedSession = localStorage.getItem(TIKTOK_SESSION_KEY);
            if (storedSession) {
                setSessionId(storedSession);
                checkAuthStatus(storedSession);
            }
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCaptionText('');
            setPrivacyLevel('SELF_ONLY');
            setStatus('idle');
            setError(null);
            setSuccessMessage(null);
        }
    }, [isOpen]);

    // Listen for OAuth popup messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'tiktok-auth-success') {
                const { sessionId: newSessionId, user: newUser } = event.data;
                setSessionId(newSessionId);
                setUser(newUser);
                localStorage.setItem(TIKTOK_SESSION_KEY, newSessionId);
                setStatus('idle');
                setError(null);
            } else if (event.data.type === 'tiktok-auth-error') {
                setError(event.data.error || 'Authentication failed');
                setStatus('error');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // --- Helpers ---

    const checkAuthStatus = async (session: string) => {
        try {
            const response = await fetch(`http://localhost:3001/api/tiktok-post/status?sessionId=${session}`);
            const data = await response.json();

            if (data.authenticated && data.user) {
                setUser(data.user);
            } else {
                // Session expired
                localStorage.removeItem(TIKTOK_SESSION_KEY);
                setSessionId(null);
                setUser(null);
            }
        } catch (err) {
            console.error('Failed to check auth status:', err);
        }
    };

    // --- Event Handlers ---

    const handleLogin = async () => {
        setStatus('authenticating');
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/tiktok-post/auth');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start authentication');
            }

            // Open OAuth popup
            const popup = window.open(
                data.authUrl,
                'TikTok Login',
                'width=600,height=700,left=200,top=100'
            );

            // Check if popup was blocked
            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }
        } catch (err: any) {
            console.error('TikTok auth error:', err);
            setError(err.message || 'Failed to start authentication');
            setStatus('error');
        }
    };

    const handleLogout = async () => {
        if (sessionId) {
            try {
                await fetch('http://localhost:3001/api/tiktok-post/logout', {
                    method: 'POST',
                    headers: { 'X-TikTok-Session': sessionId }
                });
            } catch (err) {
                console.error('Logout error:', err);
            }
        }

        localStorage.removeItem(TIKTOK_SESSION_KEY);
        setSessionId(null);
        setUser(null);
    };

    const handlePost = async () => {
        if (!sessionId || isOverLimit || !mediaUrl) return;

        setStatus('posting');
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/tiktok-post/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-TikTok-Session': sessionId
                },
                body: JSON.stringify({
                    mediaUrl: mediaUrl,
                    title: captionText.trim(),
                    privacyLevel: privacyLevel
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to post to TikTok');
            }

            setSuccessMessage(data.message || 'Video posted successfully!');
            setStatus('success');
        } catch (err: any) {
            console.error('Post error:', err);
            setError(err.message || 'Failed to post to TikTok');
            setStatus('error');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // --- Render ---

    if (!isOpen) return null;

    // Build the full media URL for display
    const fullMediaUrl = mediaUrl?.startsWith('http')
        ? mediaUrl
        : `http://localhost:3001${mediaUrl}`;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && status !== 'posting' && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-[550px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#ff0050] flex items-center justify-center text-white">
                            <TikTokIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Post to TikTok</h2>
                            {user && (
                                <p className="text-xs text-neutral-400">{user.displayName || user.username}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={status === 'posting'}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={20} className="text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Not Authenticated State */}
                    {!user && status !== 'authenticating' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#ff0050] flex items-center justify-center text-white">
                                <TikTokIcon size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">Connect your TikTok account</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Sign in to post videos directly from OpenFilm
                                </p>
                            </div>
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff0050] to-[#00f2ea] text-white font-semibold rounded-full hover:opacity-90 transition-opacity"
                            >
                                <TikTokIcon />
                                Sign in with TikTok
                            </button>
                            {error && (
                                <p className="text-sm text-red-400 mt-2">{error}</p>
                            )}
                        </div>
                    )}

                    {/* Authenticating State */}
                    {status === 'authenticating' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={40} className="text-[#00f2ea] animate-spin" />
                            <p className="text-neutral-400">Waiting for authorization...</p>
                            <p className="text-xs text-neutral-500">Complete sign-in in the popup window</p>
                        </div>
                    )}

                    {/* Authenticated - Compose Post */}
                    {user && status !== 'success' && (
                        <div className="space-y-4">
                            {/* Video Preview */}
                            <div className="rounded-xl overflow-hidden bg-black">
                                <video
                                    src={fullMediaUrl}
                                    className="w-full max-h-[200px] object-contain"
                                    controls
                                    muted
                                />
                            </div>

                            {/* Caption Input */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">Caption</label>
                                <textarea
                                    ref={textareaRef}
                                    value={captionText}
                                    onChange={(e) => setCaptionText(e.target.value)}
                                    placeholder="Add a caption with #hashtags and @mentions..."
                                    disabled={status === 'posting'}
                                    className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-xl p-4 text-white placeholder-neutral-500 focus:outline-none focus:border-[#00f2ea] transition-colors resize-none disabled:opacity-50"
                                    rows={3}
                                />
                                <div className="flex justify-end">
                                    <span className={`text-sm ${isOverLimit ? 'text-red-400' : charsRemaining <= 100 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                                        {charsRemaining}
                                    </span>
                                </div>
                            </div>

                            {/* Privacy Level Select */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">Who can view this video</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRIVACY_OPTIONS.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setPrivacyLevel(option.value)}
                                            disabled={status === 'posting'}
                                            className={`p-3 rounded-lg border text-left transition-all ${privacyLevel === option.value
                                                    ? 'border-[#00f2ea] bg-[#00f2ea]/10'
                                                    : 'border-neutral-700 hover:border-neutral-600'
                                                }`}
                                        >
                                            <span className={`text-sm font-medium ${privacyLevel === option.value ? 'text-[#00f2ea]' : 'text-white'}`}>
                                                {option.label}
                                            </span>
                                            <p className="text-xs text-neutral-500 mt-0.5">{option.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && status === 'error' && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-red-400">{error}</p>
                                        <button
                                            onClick={() => {
                                                setStatus('idle');
                                                setError(null);
                                            }}
                                            className="text-xs text-red-400/70 hover:text-red-400 mt-1 underline"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sandbox Warning */}
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-xs text-yellow-400">
                                    ⚠️ Videos posted from unaudited apps are private-only until TikTok approves your app.
                                </p>
                            </div>

                            {/* Logout option */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                <LogOut size={12} />
                                Sign out of {user.displayName || 'TikTok'}
                            </button>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle size={40} className="text-green-400" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">Posted to TikTok!</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    {successMessage || 'Your video is being processed'}
                                </p>
                            </div>
                            <p className="text-xs text-neutral-500 text-center max-w-xs">
                                It may take a few minutes for your video to appear on TikTok. Check your TikTok app to view it.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={status === 'posting'}
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        {status === 'success' ? 'Close' : 'Cancel'}
                    </button>

                    {user && status !== 'success' && (
                        <button
                            onClick={handlePost}
                            disabled={status === 'posting' || isOverLimit || !mediaUrl}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ff0050] to-[#00f2ea] text-white font-semibold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'posting' ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Post to TikTok
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
