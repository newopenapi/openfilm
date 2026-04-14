/**
 * BottomToolbar.tsx
 * 
 * Floating tools palette at the bottom of the image editor.
 * Contains mode toggles and undo/redo buttons.
 */

import React from 'react';
import { t } from '../../../i18n';

// ============================================================================
// TYPES
// ============================================================================

interface BottomToolbarProps {
    // Mode states
    isSelectMode: boolean;
    setIsSelectMode: (mode: boolean) => void;
    isDrawingMode: boolean;
    setIsDrawingMode: (mode: boolean) => void;
    isArrowMode: boolean;
    setIsArrowMode: (mode: boolean) => void;
    isTextMode: boolean;
    setIsTextMode: (mode: boolean) => void;
    isCropMode: boolean;
    setIsCropMode: (mode: boolean) => void;
    onCropModeEnter: () => void;
    // Mode helpers
    setShowToolSettings: (show: boolean) => void;
    setSelectedElementId: (id: string | null) => void;
    setDrawingTool: (tool: 'brush' | 'eraser') => void;
    setShowTextSettings: (show: boolean) => void;
    // History
    historyStackLength: number;
    redoStackLength: number;
    handleUndo: () => void;
    handleRedo: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
    isSelectMode,
    setIsSelectMode,
    isDrawingMode,
    setIsDrawingMode,
    isArrowMode,
    setIsArrowMode,
    isTextMode,
    setIsTextMode,
    isCropMode,
    setIsCropMode,
    onCropModeEnter,
    setShowToolSettings,
    setSelectedElementId,
    setDrawingTool,
    setShowTextSettings,
    historyStackLength,
    redoStackLength,
    handleUndo,
    handleRedo
}) => {
    // --- Handler Functions ---

    const handleSelectModeClick = () => {
        setIsSelectMode(!isSelectMode);
        if (!isSelectMode) {
            setIsDrawingMode(false);
            setIsArrowMode(false);
            setIsTextMode(false);
            setIsCropMode(false);
            setShowToolSettings(false);
            setShowTextSettings(false);
        }
        setSelectedElementId(null);
    };

    const handleDrawingModeClick = () => {
        setIsDrawingMode(!isDrawingMode);
        if (!isDrawingMode) {
            setDrawingTool('brush');
            setShowToolSettings(false);
            setShowTextSettings(false);
            setIsArrowMode(false);
            setIsSelectMode(false);
            setIsTextMode(false);
            setIsCropMode(false);
        }
    };

    const handleArrowModeClick = () => {
        setIsArrowMode(!isArrowMode);
        if (!isArrowMode) {
            setIsDrawingMode(false);
            setIsSelectMode(false);
            setIsTextMode(false);
            setIsCropMode(false);
            setShowToolSettings(false);
            setShowTextSettings(false);
        }
    };

    const handleTextModeClick = () => {
        setIsTextMode(!isTextMode);
        if (!isTextMode) {
            setIsDrawingMode(false);
            setIsSelectMode(false);
            setIsArrowMode(false);
            setIsCropMode(false);
            setShowToolSettings(false);
            setShowTextSettings(true);
        } else {
            setShowTextSettings(false);
        }
    };

    const handleCropModeClick = () => {
        setIsCropMode(!isCropMode);
        if (!isCropMode) {
            setIsDrawingMode(false);
            setIsSelectMode(false);
            setIsArrowMode(false);
            setIsTextMode(false);
            setShowToolSettings(false);
            setShowTextSettings(false);
            onCropModeEnter();
        }
    };

    return (
        <div className="bg-[#2a2a2a] bg-opacity-95 backdrop-blur-sm rounded-xl border border-neutral-600 px-2 py-1.5 flex items-center gap-1 shadow-2xl pointer-events-auto">
            {/* Select Mode */}
            <button
                onClick={handleSelectModeClick}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isSelectMode
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title="Select"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    <path d="M13 13l6 6" />
                </svg>
            </button>

            {/* Drawing Mode (Pen) */}
            <button
                onClick={handleDrawingModeClick}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDrawingMode
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title="Drawing Mode"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
            </button>

            {/* Arrow Tool */}
            <button
                onClick={handleArrowModeClick}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isArrowMode
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title="Arrow"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>

            {/* Text Tool */}
            <button
                onClick={handleTextModeClick}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isTextMode
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title="Add Text"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V4h16v3" />
                    <path d="M9 20h6" />
                    <path d="M12 4v16" />
                </svg>
            </button>

            {/* Crop Tool */}
            <button
                onClick={handleCropModeClick}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isCropMode
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title="Crop"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2v4" />
                    <path d="M18 22v-4" />
                    <path d="M2 6h4" />
                    <path d="M22 18h-4" />
                    <rect x="6" y="6" width="12" height="12" />
                </svg>
            </button>

            <div className="w-px h-6 bg-neutral-600 mx-1"></div>

            {/* Undo */}
            <button
                onClick={handleUndo}
                disabled={historyStackLength === 0}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${historyStackLength === 0
                    ? 'text-neutral-600 cursor-not-allowed'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title={`${t('undo')} (Ctrl+Z)`}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
            </button>

            {/* Redo */}
            <button
                onClick={handleRedo}
                disabled={redoStackLength === 0}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${redoStackLength === 0
                    ? 'text-neutral-600 cursor-not-allowed'
                    : 'hover:bg-neutral-700 text-neutral-400'
                    }`}
                title={`${t('redo')} (Ctrl+Shift+Z)`}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                </svg>
            </button>
        </div>
    );
};
