import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, RefreshCw, Upload, Check } from 'lucide-react';
import { apiRequest } from '../../services/authService';
import { t } from '../../i18n';

type TabKey = 'portrait' | 'image' | 'video' | 'audio';

type PortraitAssetItem = {
  assetId: string;
  name?: string | null;
  status?: string | null;
  sourceUrl?: string | null;
  assetUri: string;
  updatedAt?: string | null;
};

export function SeedanceComplianceLibraryModal({
  isOpen,
  onClose,
  selectedAssetId,
  onSelect
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedAssetId?: string;
  onSelect: (assetId: string | undefined) => void;
}) {
  const [tab, setTab] = useState<TabKey>('portrait');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [assets, setAssets] = useState<PortraitAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchGroup = async () => {
    const r: any = await apiRequest('/portrait/group');
    setGroupId(r.group?.groupId || null);
  };

  const fetchAssets = async () => {
    const r: any = await apiRequest('/portrait/assets');
    setAssets(r.items || []);
  };

  const refreshFromRemote = async () => {
    await apiRequest('/portrait/assets/refresh', { method: 'POST', body: JSON.stringify({}) });
    await fetchAssets();
  };

  const handleAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const bytedToken = params.get('bytedToken');
    const resultCode = params.get('resultCode');
    if (!bytedToken) return;

    try {
      setLoading(true);
      setError(null);
      
      const r: any = await apiRequest('/portrait/resolve', {
        method: 'POST',
        body: JSON.stringify({ bytedToken, resultCode })
      });
      
      if (r.success) {
        setGroupId(r.groupId);
        await fetchAssets();
      } else {
        setError(r.message || t('authenticationFailed'));
      }
    } catch (e: any) {
      setError(e?.message || t('authenticationFailed'));
    } finally {
      setLoading(false);
    }

    // 清理URL参数
    const url = new URL(window.location.href);
    url.searchParams.delete('bytedToken');
    url.searchParams.delete('resultCode');
    url.searchParams.delete('algorithmBaseRespCode');
    url.searchParams.delete('reqMeasureInfoValue');
    url.searchParams.delete('verify_type');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  };

  useEffect(() => {
    if (!isOpen) return;
    setTab('portrait');
    setError(null);
    setLoading(true);
    
    const init = async () => {
      try {
        // 检查是否有认证回调
        await handleAuthCallback();
        await Promise.all([fetchGroup(), fetchAssets()]);
      } catch (e: any) {
        setError(e?.message || 'failed');
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, [isOpen]);

  const activeAssets = useMemo(() => assets.filter(a => a.status === 'Active'), [assets]);

  const startVerification = async () => {
    try {
      setError(null);
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const r: any = await apiRequest('/portrait/session', {
        method: 'POST',
        body: JSON.stringify({ callbackUrl })
      });
      if (r?.h5Link) {
        window.open(r.h5Link, '_self');
      }
    } catch (e: any) {
      setError(e?.message || t('verificationFailed'));
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      await apiRequest('/portrait/assets/upload', { method: 'POST', body: fd });
      await fetchGroup();
      await fetchAssets();
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="text-white font-semibold">{t('seedanceComplianceLibrary')}</div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center justify-center"
            title={t('cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl border border-neutral-800 bg-black/30 p-1">
              {([
                { key: 'portrait', label: t('portraitAssets') },
                { key: 'image', label: t('image') },
                { key: 'video', label: t('video') },
                { key: 'audio', label: t('audio') }
              ] as Array<{ key: TabKey; label: string }>).map((x) => (
                <button
                  key={x.key}
                  onClick={() => setTab(x.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === x.key ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {x.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-neutral-500">
              {selectedAssetId ? `${t('selectedCount')}: 1` : `${t('selectedCount')}: 0`}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {tab !== 'portrait' ? (
            <div className="rounded-2xl border border-neutral-800 bg-black/30 p-8 text-neutral-500 text-sm">
              {t('comingSoon')}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-400">
                  {groupId ? `GroupId: ${groupId}` : t('portraitNotVerified')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshFromRemote}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50 flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {t('refresh')}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={!groupId || uploading}
                    className="px-3 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {t('upload')}
                  </button>
                </div>
              </div>

              {!groupId && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button
                    onClick={startVerification}
                    className="rounded-2xl border border-neutral-800 bg-white/5 hover:bg-white/10 transition-colors p-5 flex flex-col items-center justify-center gap-3 aspect-[4/3]"
                  >
                    <div className="w-12 h-12 rounded-full border border-neutral-800 bg-black/30 flex items-center justify-center text-white">
                      <Plus size={20} />
                    </div>
                    <div className="text-sm font-medium text-white">{t('recordNewRealPerson')}</div>
                    <div className="text-xs text-neutral-500">{t('startVerification')}</div>
                  </button>
                </div>
              )}

              {groupId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assets.map((a) => {
                    const isSelected = selectedAssetId === a.assetId;
                    const disabled = a.status !== 'Active';
                    return (
                      <button
                        key={a.assetId}
                        onClick={() => onSelect(isSelected ? undefined : a.assetId)}
                        disabled={disabled}
                        className={`text-left rounded-2xl border overflow-hidden transition-colors ${
                          isSelected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-neutral-800 bg-white/5 hover:bg-white/10'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="h-[120px] bg-black/40 flex items-center justify-center">
                          {a.sourceUrl ? (
                            <img src={a.sourceUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-neutral-600 text-xs">{a.assetId.slice(0, 10)}</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{a.name || a.assetId}</div>
                              <div className="mt-1 text-xs text-neutral-500 truncate">{a.status || ''}</div>
                            </div>
                            {isSelected && (
                              <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                <Check size={16} />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {groupId && assets.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-neutral-800 bg-black/30 p-8 text-neutral-500 text-sm">
                      {t('noPortraitAssets')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-neutral-800 bg-black/30 text-neutral-200 hover:bg-black/50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-medium"
                >
                  {t('confirm')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

