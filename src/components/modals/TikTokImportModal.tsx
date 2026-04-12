/**
 * TikTokImportModal.tsx
 * 
 * Modal overlay for importing TikTok videos without watermark.
 * Allows users to paste a TikTok URL and download the video to the canvas.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Loader2, CheckCircle, AlertCircle, Link2 } from 'lucide-react';
import { t } from '../../i18n';

// ============================================================================
// TYPES
// ============================================================================

interface TikTokImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVideoImported: (videoUrl: string, videoInfo: TikTokVideoInfo) => void;
}

export interface TikTokVideoInfo {
    title: string;
    author: string;
    duration: number;
    cover: string | null;
    trimmed: boolean;
}

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export const TikTokImportModal: React.FC<TikTokImportModalProps> = ({
    isOpen,
    onClose,
    onVideoImported
}) => {
    // --- State ---
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<TikTokVideoInfo | null>(null);
    const [importedVideoUrl, setImportedVideoUrl] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setUrl('');
            setStatus('idle');
            setError(null);
            setVideoInfo(null);
            setImportedVideoUrl(null);
        }
    }, [isOpen]);

    // --- Event Handlers ---

    const handleImport = async () => {
        if (!url.trim()) {
            setError('Please enter a TikTok URL');
            return;
        }

        setStatus('loading');
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/tiktok/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), enableTrim: true })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to import video');
            }

            // Success!
            const info: TikTokVideoInfo = {
                title: data.title || 'TikTok Video',
                author: data.author || 'Unknown',
                duration: data.duration || 0,
                cover: data.cover || null,
                trimmed: data.trimmed || false
            };

            setVideoInfo(info);
            setImportedVideoUrl(data.videoUrl);
            setStatus('success');

        } catch (err: any) {
            console.error('TikTok import error:', err);
            setError(err.message || 'Failed to import video');
            setStatus('error');
        }
    };

    const handleAddToCanvas = () => {
        if (importedVideoUrl && videoInfo) {
            onVideoImported(importedVideoUrl, videoInfo);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && status === 'idle') {
            handleImport();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // --- Render ---

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-[500px] shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#ff0050] flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{t('importTikTokVideo')}</h2>
                            <p className="text-xs text-neutral-400">{t('downloadWithoutWatermark')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* URL Input */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-300">
                            {t('tiktokVideoUrl')}
                        </label>
                        <div className="relative">
                            <Link2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('pasteTikTokUrlPlaceholder')}
                                disabled={status === 'loading' || status === 'success'}
                                className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#00f2ea] transition-colors disabled:opacity-50"
                            />
                        </div>
                        <p className="text-xs text-neutral-500">
                            {t('supportedTikTokLinks')}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && status === 'error' && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
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
                                    {t('tryAgain')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {status === 'loading' && (
                        <div className="mt-6 flex flex-col items-center gap-3 py-4">
                            <Loader2 size={32} className="text-[#00f2ea] animate-spin" />
                            <p className="text-neutral-400 text-sm">{t('downloadingVideo')}</p>
                            <p className="text-neutral-500 text-xs">{t('mayTakeAMoment')}</p>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && videoInfo && importedVideoUrl && (
                        <div className="mt-6 space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-green-400 font-medium">{t('videoDownloadedSuccessfully')}</p>
                                    <p className="text-xs text-neutral-400 mt-1 truncate" title={videoInfo.title}>
                                        {videoInfo.title}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        By @{videoInfo.author} • {Math.round(videoInfo.duration)}s
                                        {videoInfo.trimmed && ' • Trimmed'}
                                    </p>
                                </div>
                            </div>

                            {/* Video Preview */}
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <video
                                    src={`http://localhost:3001${importedVideoUrl}`}
                                    className="w-full h-full object-contain"
                                    controls
                                    autoPlay
                                    muted
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        {t('cancel')}
                    </button>

                    {status === 'success' ? (
                        <button
                            onClick={handleAddToCanvas}
                            className="flex items-center gap-2 px-6 py-2 bg-[#00f2ea] hover:bg-[#00d4d4] text-black font-medium rounded-lg transition-colors"
                        >
                            <CheckCircle size={18} />
                            {t('addToCanvas')}
                        </button>
                    ) : (
                        <button
                            onClick={handleImport}
                            disabled={status === 'loading' || !url.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ff0050] to-[#00f2ea] hover:opacity-90 text-white font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('importing')}
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    {t('importVideo')}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
