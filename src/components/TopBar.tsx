/**
 * TopBar.tsx
 * 
 * Top navigation bar component with canvas title, save button, and other controls.
 */

import React, { useState } from 'react';
import { Plus, Save, Loader2, Settings } from 'lucide-react';
import { Language } from '../i18n';

interface TopBarProps {
    // Title
    canvasTitle: string;
    isEditingTitle: boolean;
    editingTitleValue: string;
    canvasTitleInputRef: React.RefObject<HTMLInputElement>;
    setCanvasTitle: (title: string) => void;
    setIsEditingTitle: (editing: boolean) => void;
    setEditingTitleValue: (value: string) => void;
    // Actions
    onSave: () => void | Promise<void>;
    onNew: () => void;
    hasUnsavedChanges: boolean;
    lastAutoSaveTime?: number;
    // Layout
    isChatOpen?: boolean;
    // Theme
    canvasTheme: 'dark' | 'light';
    onToggleTheme: () => void;
    // Language
    currentLang: Language;
    onToggleLanguage: () => void;
    // Settings (Electron)
    isElectron?: boolean;
    onOpenSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    canvasTitle,
    isEditingTitle,
    editingTitleValue,
    canvasTitleInputRef,
    setCanvasTitle,
    setIsEditingTitle,
    setEditingTitleValue,
    onSave,
    onNew,
    hasUnsavedChanges,
    lastAutoSaveTime,
    isChatOpen = false,
    canvasTheme,
    onToggleTheme,
    currentLang,
    onToggleLanguage,
    isElectron,
    onOpenSettings
}) => {
    const [showNewConfirm, setShowNewConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleTitleBlur = () => {
        if (editingTitleValue.trim()) {
            setCanvasTitle(editingTitleValue.trim());
        } else {
            setEditingTitleValue(canvasTitle);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (editingTitleValue.trim()) {
                setCanvasTitle(editingTitleValue.trim());
            }
            setIsEditingTitle(false);
        } else if (e.key === 'Escape') {
            setEditingTitleValue(canvasTitle);
            setIsEditingTitle(false);
        }
    };

    const handleTitleDoubleClick = () => {
        setEditingTitleValue(canvasTitle);
        setIsEditingTitle(true);
    };

    const handleNewClick = () => {
        if (hasUnsavedChanges) {
            setShowNewConfirm(true);
        } else {
            onNew();
        }
    };

    const handleSaveAndNew = async () => {
        try {
            setIsSaving(true);
            await onSave();
            setShowNewConfirm(false);
            onNew();
        } catch (error) {
            console.error("Failed to save and new:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardAndNew = () => {
        setShowNewConfirm(false);
        onNew();
    };

    return (
        <>
            <div
                className="fixed top-0 left-0 h-14 flex items-center justify-between px-6 z-50 pointer-events-none transition-all duration-300"
                style={{ width: isChatOpen ? 'calc(100% - 400px)' : '100%' }}
            >
                {/* Left: Logo & Title */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    <img src="/OpenFilm-logo.png" alt="OpenFilm Logo" className="w-8 h-8 rounded-lg object-contain bg-black/20" />
                    {isEditingTitle ? (
                        <input
                            ref={canvasTitleInputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleTitleKeyDown}
                            className="font-semibold text-neutral-300 bg-transparent border-b border-blue-500 outline-none min-w-[100px]"
                        />
                    ) : (
                        <span
                            className={`font-semibold cursor-pointer transition-colors ${canvasTheme === 'dark' ? 'text-neutral-300 hover:text-white' : 'text-neutral-900 hover:text-neutral-600'}`}
                            onDoubleClick={handleTitleDoubleClick}
                            title="Double-click to rename"
                        >
                            {canvasTitle}
                        </span>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Auto-save notification - before save button */}
                    {lastAutoSaveTime && !hasUnsavedChanges && (
                        <div className={`text-[10px] font-medium px-2 py-1 rounded border animate-in fade-in duration-500 ${canvasTheme === 'dark'
                            ? 'text-neutral-500 border-neutral-800'
                            : 'text-neutral-400 border-neutral-100'
                            }`}>
                            {currentLang === 'en' ? 'Auto-saved' : '已自动保存'} {new Date(lastAutoSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    <button
                        onClick={() => onSave()}
                        className={`text-sm px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors font-medium border ${canvasTheme === 'dark'
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-600'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-neutral-300 shadow-sm'
                            }`}
                    >
                        <Save size={16} />
                        {currentLang === 'en' ? 'Save' : '保存'}
                    </button>
                    <button
                        onClick={handleNewClick}
                        className={`text-sm px-4 py-2.5 rounded-full flex items-center gap-2 transition-colors font-medium border ${canvasTheme === 'dark'
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-600'
                            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900 border-neutral-300'
                            }`}
                    >
                        <Plus size={16} />
                        {currentLang === 'en' ? 'New' : '新建'}
                    </button>
                    <button
                        onClick={onToggleTheme}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${canvasTheme === 'dark'
                            ? 'bg-neutral-900 border-neutral-700 text-yellow-400 hover:bg-neutral-800'
                            : 'bg-white border-neutral-200 text-orange-500 hover:bg-neutral-50 shadow-sm'
                            }`}
                        title={canvasTheme === 'dark' ? "Switch to Day Mode" : "Switch to Night Mode"}
                    >
                        {canvasTheme === 'dark' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                    </button>
                    {/* Settings Button (Electron only) */}
                    {isElectron && (
                        <button
                            onClick={onOpenSettings}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${canvasTheme === 'dark'
                                ? 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'
                                : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm'
                                }`}
                            title={currentLang === 'en' ? 'Settings' : '设置'}
                        >
                            <Settings size={18} />
                        </button>
                    )}
                    {/* Language Toggle Button */}
                    <button
                        onClick={onToggleLanguage}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border text-sm font-bold ${
                            canvasTheme === 'dark'
                                ? 'bg-neutral-900 border-neutral-700 text-blue-400 hover:bg-neutral-800'
                                : 'bg-white border-neutral-200 text-blue-600 hover:bg-neutral-50 shadow-sm'
                        }`}
                        title={currentLang === 'en' ? '切换到中文' : 'Switch to English'}
                    >
                        {currentLang === 'en' ? '中' : 'EN'}
                    </button>
                </div>
            </div>

            {/* Unsaved Changes Confirmation Modal */}
            {showNewConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className={`backdrop-blur-xl rounded-2xl p-6 w-[400px] shadow-2xl border ${
                        canvasTheme === 'dark' 
                            ? 'bg-[#1a1a1a]/95 border-neutral-700' 
                            : 'bg-white/95 border-neutral-200'
                    }`}>
                        <h3 className={`text-lg font-semibold mb-2 ${canvasTheme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
                            {currentLang === 'en' ? 'Unsaved Changes' : '未保存的更改'}
                        </h3>
                        <p className={`text-sm mb-6 ${canvasTheme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
                            {currentLang === 'en' 
                                ? 'You have unsaved changes. Would you like to save before creating a new canvas?' 
                                : '您有未保存的更改。是否在创建新画布前保存？'}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowNewConfirm(false)}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    canvasTheme === 'dark'
                                        ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                                        : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                                }`}
                            >
                                {currentLang === 'en' ? 'Cancel' : '取消'}
                            </button>
                            <button
                                onClick={handleDiscardAndNew}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {currentLang === 'en' ? 'Discard' : '放弃'}
                            </button>
                            <button
                                onClick={handleSaveAndNew}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {currentLang === 'en' ? 'Saving...' : '保存中...'}
                                    </>
                                ) : (
                                    currentLang === 'en' ? 'Save & New' : '保存并新建'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
