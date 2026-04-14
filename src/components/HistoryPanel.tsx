/**
 * HistoryPanel.tsx
 * 
 * Panel for browsing generated image and video history.
 * Assets are grouped by date and displayed in a grid.
 * Clicking an asset applies it to the selected node.
 * 
 * Uses infinite scroll with pagination for performance.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Trash2, Maximize2, Image as ImageIcon, Video } from 'lucide-react';
import { t } from '../i18n';
import { getToken } from '../services/authService';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 18; // 6 columns × 3 rows

// ============================================================================
// TYPES
// ============================================================================

interface AssetMetadata {
    id: string;
    filename: string;
    prompt: string;
    createdAt: string;
    type: string;
    url: string;
    model?: string;
}

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAsset: (type: 'images' | 'videos', url: string, prompt: string, model?: string) => void;
    panelY?: number;
    canvasTheme?: 'dark' | 'light';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
    isOpen,
    onClose,
    onSelectAsset,
    panelY = 200,
    canvasTheme = 'dark'
}) => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
    const [assets, setAssets] = useState<AssetMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [imageTotalCount, setImageTotalCount] = useState<number>(0);
    const [videoTotalCount, setVideoTotalCount] = useState<number>(0);

    // --- Refs ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    // Theme helper
    const isDark = canvasTheme === 'dark';

    // --- Fetch initial page and counts when panel opens ---
    useEffect(() => {
        if (isOpen) {
            // Reset pagination state for current tab
            setAssets([]);
            setOffset(0);
            setHasMore(true);
            fetchAssets(0, true);

            // Fetch total counts for both tabs
            fetchCounts();
        }
    }, [isOpen, activeTab]);

    /**
     * Fetch total counts for both images and videos
     */
    const fetchCounts = async () => {
        try {
            const token = getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            // Fetch counts in parallel
            // Use relative path to go through Vite proxy
            const [imgRes, vidRes] = await Promise.all([
                fetch(`/api/assets?type=images&limit=1`, { headers }),
                fetch(`/api/assets?type=videos&limit=1`, { headers })
            ]);

            if (imgRes.ok) {
                const imgData = await imgRes.json();
                setImageTotalCount(imgData.total);
            }

            if (vidRes.ok) {
                const vidData = await vidRes.json();
                setVideoTotalCount(vidData.total);
            }
        } catch (error) {
            console.error('Failed to fetch asset counts:', error);
        }
    };

    // --- Intersection Observer for infinite scroll ---
    useEffect(() => {
        if (!loadMoreTriggerRef.current || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting && hasMore && !loadingMore && !loading) {
                    loadMoreAssets();
                }
            },
            { threshold: 0.1, root: scrollContainerRef.current }
        );

        observer.observe(loadMoreTriggerRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, offset]);

    /**
     * Fetch assets with pagination
     * @param pageOffset - Offset to fetch from
     * @param isInitial - Whether this is the initial fetch (shows full loader)
     */
    const fetchAssets = async (pageOffset: number, isInitial: boolean = false) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const token = getToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(
                `/api/assets?type=${activeTab === 'images' ? 'images' : 'videos'}&limit=${PAGE_SIZE}&offset=${pageOffset}`,
                { headers }
            );
            if (response.ok) {
                const data = await response.json();

                if (isInitial) {
                    setAssets(data.assets);
                } else {
                    setAssets(prev => [...prev, ...data.assets]);
                }

                setHasMore(data.hasMore);
                setOffset(pageOffset + data.assets.length);

                // Update total counts
                if (activeTab === 'images') {
                    setImageTotalCount(data.total);
                } else {
                    setVideoTotalCount(data.total);
                }
            }
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    /**
     * Load more assets when scrolling
     */
    const loadMoreAssets = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchAssets(offset, false);
        }
    }, [offset, loadingMore, hasMore, activeTab]);

    const handleDelete = async (id: string) => {
        try {
            const token = getToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/assets/${id}`, {
                method: 'DELETE',
                headers
            });
            if (response.ok) {
                setAssets(prev => prev.filter(a => a.id !== id));
                // Update counts
                if (activeTab === 'images') {
                    setImageTotalCount(prev => prev - 1);
                } else {
                    setVideoTotalCount(prev => prev - 1);
                }
            }
        } catch (error) {
            console.error('Failed to delete asset:', error);
        }
        setDeleteConfirm(null);
    };

    const handleSelectAsset = (asset: AssetMetadata) => {
        // Construct full URL for the asset - use relative path to match current host/port
        const fullUrl = asset.url;
        onSelectAsset(activeTab, fullUrl, asset.prompt || '', asset.model);
    };

    // Group assets by date
    const groupedAssets = assets.reduce((groups, asset) => {
        const date = new Date(asset.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(asset);
        return groups;
    }, {} as Record<string, AssetMetadata[]>);

    const sortedDates = Object.keys(groupedAssets).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
    );

    if (!isOpen) return null;

    return (
        <>
            {/* Main Panel */}
            <div
                className={`fixed left-20 w-[700px] backdrop-blur-xl border rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden max-h-[500px] transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]/95 border-neutral-800' : 'bg-white/95 border-neutral-200'}`}
                style={{ top: panelY }}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                    <div className="flex items-center gap-6">
                        <button
                            className={`text-sm font-medium transition-colors pb-1 flex items-center gap-2 ${activeTab === 'images'
                                ? isDark ? 'text-white border-b-2 border-white' : 'text-neutral-900 border-b-2 border-neutral-900'
                                : isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'
                                }`}
                            onClick={() => setActiveTab('images')}
                        >
                            <ImageIcon size={16} />
                            {t('imageHistory')} ({imageTotalCount})
                        </button>
                        <button
                            className={`text-sm font-medium transition-colors pb-1 flex items-center gap-2 ${activeTab === 'videos'
                                ? isDark ? 'text-white border-b-2 border-white' : 'text-neutral-900 border-b-2 border-neutral-900'
                                : isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'
                                }`}
                            onClick={() => setActiveTab('videos')}
                        >
                            <Video size={16} />
                            {t('videoHistory')} ({videoTotalCount})
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-colors ${isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
                    >
                        <Maximize2 size={18} />
                    </button>
                </div>

                {/* Content */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: isDark ? '#525252 #171717' : '#d4d4d4 #fafafa'
                    }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="animate-spin text-neutral-500" size={24} />
                        </div>
                    ) : assets.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center h-40 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                                {activeTab === 'images' ? <ImageIcon size={24} /> : <Video size={24} />}
                            </div>
                            <p>{activeTab === 'images' ? t('noImagesFound') : t('noVideosFound')}</p>
                            <p className="text-xs mt-1">{activeTab === 'images' ? t('generatedImagesAppearHere') : t('generatedVideosAppearHere')}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map(date => (
                                <div key={date}>
                                    <h3 className={`text-sm mb-3 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{date}</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {groupedAssets[date].map(asset => (
                                            <div
                                                key={asset.id}
                                                onClick={() => handleSelectAsset(asset)}
                                                className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all group relative ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'}`}
                                            >
                                                {activeTab === 'images' ? (
                                                    <img
                                                        src={asset.url}
                                                        alt={asset.prompt || 'Generated image'}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <video
                                                        src={asset.url}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        preload="metadata"
                                                        onMouseEnter={(e) => e.currentTarget.play()}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.pause();
                                                            e.currentTarget.currentTime = 0;
                                                        }}
                                                    />
                                                )}
                                                {/* Delete button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm(asset.id);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Load more trigger for infinite scroll */}
                            {hasMore && (
                                <div
                                    ref={loadMoreTriggerRef}
                                    className="flex items-center justify-center py-4"
                                >
                                    {loadingMore && (
                                        <Loader2 className="animate-spin text-neutral-500" size={20} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className={`border rounded-2xl p-6 w-[340px] shadow-2xl ${isDark ? 'bg-[#1a1a1a] border-neutral-700' : 'bg-white border-neutral-200'}`}>
                        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>{t('deleteAssetTitle')}</h3>
                        <p className={`text-sm mb-6 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                            {t('deleteAssetConfirm').replace('{type}', activeTab === 'images' ? t('imageHistory') : t('videoHistory'))}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'}`}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-colors"
                            >
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
