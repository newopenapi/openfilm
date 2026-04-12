/**
 * SettingsModal.tsx
 * 
 * Electron APP 设置模态框
 * 用于配置 API Keys 和应用设置
 */

import React, { useState, useEffect } from 'react';
import { X, Key, Globe, FolderOpen, Upload, Loader2, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isElectron?: boolean;
}

// API Key 配置项
const API_KEY_CONFIGS = [
    {
        key: 'GEMINI_API_KEY',
        name: 'Google Gemini',
        placeholder: 'AIzaSy...',
        description: '用于 GPT Image 和 Gemini 图片生成',
        url: 'https://makersuite.google.com/app/apikey'
    },
    {
        key: 'KLING_ACCESS_KEY',
        name: 'Kling AI Access Key',
        placeholder: 'Access Key',
        description: 'Kling AI 视频生成',
        url: 'https://klingai.com/'
    },
    {
        key: 'KLING_SECRET_KEY',
        name: 'Kling AI Secret Key',
        placeholder: 'Secret Key',
        description: '',
        url: 'https://klingai.com/'
    },
    {
        key: 'HAILUO_API_KEY',
        name: 'Hailuo AI (MiniMax)',
        placeholder: 'API Key',
        description: 'Hailuo 视频生成',
        url: 'https://hailuoai.video/'
    },
    {
        key: 'OPENAI_API_KEY',
        name: 'OpenAI',
        placeholder: 'sk-...',
        description: 'GPT Image 图片生成',
        url: 'https://platform.openai.com/api-keys'
    },
    {
        key: 'FAL_API_KEY',
        name: 'Fal.ai',
        placeholder: 'API Key',
        description: 'Kling V2.6 运动控制',
        url: 'https://fal.ai/dashboard/keys'
    },
    {
        key: 'VOLCANO_API_KEY',
        name: '火山引擎 (Seedance)',
        placeholder: 'API Key',
        description: 'Seedance 视频生成',
        url: 'https://console.volcengine.com/ark'
    },
    {
        key: 'NANOBANANA_API_KEY',
        name: 'NanoBanana (Gemini 图片)',
        placeholder: 'API Key',
        description: 'Gemini 图片生成代理',
        url: ''
    }
];

const BASE_URL_CONFIGS = [
    { key: 'GOOGLE_BASE_URL', name: 'Google API 地址', default: 'https://generativelanguage.googleapis.com' },
    { key: 'OPENAI_BASE_URL', name: 'OpenAI API 地址', default: 'https://api.openai.com/v1' },
    { key: 'KLING_BASE_URL', name: 'Kling AI 地址', default: 'https://api-singapore.klingai.com' },
    { key: 'HAILUO_BASE_URL', name: 'Hailuo AI 地址', default: 'https://api.minimax.io/v1' },
    { key: 'FAL_BASE_URL', name: 'Fal.ai 地址', default: 'https://queue.fal.run' },
    { key: 'VOLCANO_BASE_URL', name: '火山引擎地址', default: 'https://ark.cn-beijing.volces.com/api/v3' },
    { key: 'NANOBANANA_BASE_URL', name: 'NanoBanana 地址', default: '' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isElectron }) => {
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showBaseUrls, setShowBaseUrls] = useState(false);

    useEffect(() => {
        if (isOpen && isElectron) {
            loadSettings();
        }
    }, [isOpen, isElectron]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const result = await (window as any).electronAPI.getApiKeys();
            if (result) {
                setApiKeys(result.apiKeys || {});
                setBaseUrls(result.baseUrls || {});
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            await (window as any).electronAPI.saveApiKeys({ apiKeys, baseUrls });
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                onClose();
                // 提示用户刷新页面
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('error');
        }
        setIsSaving(false);
    };

    const handleImportEnv = async () => {
        try {
            const result = await (window as any).electronAPI.importEnvFile();
            if (result.success && !result.canceled) {
                if (result.apiKeys) {
                    setApiKeys(prev => ({ ...prev, ...result.apiKeys }));
                }
                if (result.baseUrls) {
                    setBaseUrls(prev => ({ ...prev, ...result.baseUrls }));
                }
            }
        } catch (error) {
            console.error('Failed to import env:', error);
        }
    };

    const handleOpenExternal = (url: string) => {
        if (isElectron && url) {
            (window as any).electronAPI.openExternal(url);
        } else if (url) {
            window.open(url, '_blank');
        }
    };

    const handleOpenDataFolder = () => {
        if (isElectron) {
            (window as any).electronAPI.openDataFolder();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-neutral-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
                    <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">{t('settings')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* 导入 .env 文件 */}
                            <div className="mb-6">
                                <button
                                    onClick={handleImportEnv}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    {t('importEnvFile')}
                                </button>
                                <p className="mt-2 text-sm text-neutral-500">
                                    {t('importEnvHint')}
                                </p>
                            </div>

                            {/* API Keys */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
                                    {t('apiKeys')}
                                </h3>
                                
                                {API_KEY_CONFIGS.map((config) => (
                                    <div key={config.key} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-white">
                                                {config.name}
                                            </label>
                                            {config.url && (
                                                <button
                                                    onClick={() => handleOpenExternal(config.url)}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    {t('getKey')} →
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="password"
                                            value={apiKeys[config.key] || ''}
                                            onChange={(e) => setApiKeys(prev => ({ ...prev, [config.key]: e.target.value }))}
                                            placeholder={config.placeholder}
                                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                                        />
                                        {config.description && (
                                            <p className="text-xs text-neutral-500">{config.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Base URLs */}
                            <div className="mt-6 pt-6 border-t border-neutral-700">
                                <button
                                    onClick={() => setShowBaseUrls(!showBaseUrls)}
                                    className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
                                >
                                    <Globe className="w-4 h-4" />
                                    {t('customApiEndpoint')} {showBaseUrls ? '▲' : '▼'}
                                </button>
                                
                                {showBaseUrls && (
                                    <div className="mt-4 space-y-3">
                                        <p className="text-xs text-neutral-500">
                                            {t('customEndpointHint')}
                                        </p>
                                        {BASE_URL_CONFIGS.map((config) => (
                                            <div key={config.key} className="space-y-1">
                                                <label className="text-sm text-neutral-300">
                                                    {config.name}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={baseUrls[config.key] || ''}
                                                    onChange={(e) => setBaseUrls(prev => ({ ...prev, [config.key]: e.target.value }))}
                                                    placeholder={config.default}
                                                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 数据目录 */}
                            {isElectron && (
                                <div className="mt-6 pt-6 border-t border-neutral-700">
                                    <button
                                        onClick={handleOpenDataFolder}
                                        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        {t('openDataFolder')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-700">
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-2 text-green-400 text-sm">
                            <Check className="w-4 h-4" />
                            {t('saved')}
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {t('saveFailed')}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 翻译函数占位（需要在实际使用时替换为 i18n）
const t = (key: string): string => {
    const translations: Record<string, string> = {
        settings: '设置',
        apiKeys: 'API 密钥',
        importEnvFile: '导入 .env 文件',
        importEnvHint: '导入已有的 .env 配置文件，自动填充 API Key',
        getKey: '获取密钥',
        customApiEndpoint: '自定义 API 地址',
        customEndpointHint: '用于配置代理或中转站地址',
        openDataFolder: '打开数据目录',
        saved: '已保存',
        saveFailed: '保存失败',
        cancel: '取消',
        save: '保存'
    };
    return translations[key] || key;
};
