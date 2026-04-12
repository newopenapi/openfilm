/**
 * DrawingToolbar.tsx
 * 
 * Sub-toolbar for brush/eraser tools with settings panels.
 * Only visible when drawing mode is active.
 */

import React from 'react';
import { t } from '../../../i18n';

// ============================================================================
// TYPES
// ============================================================================

interface DrawingToolbarProps {
    drawingTool: 'brush' | 'eraser';
    setDrawingTool: (tool: 'brush' | 'eraser') => void;
    brushWidth: number;
    setBrushWidth: (width: number) => void;
    eraserWidth: number;
    setEraserWidth: (width: number) => void;
    brushColor: string;
    setBrushColor: (color: string) => void;
    showToolSettings: boolean;
    setShowToolSettings: (show: boolean) => void;
    presetColors: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
    drawingTool,
    setDrawingTool,
    brushWidth,
    setBrushWidth,
    eraserWidth,
    setEraserWidth,
    brushColor,
    setBrushColor,
    showToolSettings,
    setShowToolSettings,
    presetColors
}) => {
    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-[#2a2a2a] bg-opacity-95 backdrop-blur-sm rounded-xl border border-neutral-600 px-2 py-1.5 flex items-center gap-1 shadow-2xl">
                {/* Brush Button with Settings Panel */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setDrawingTool('brush');
                            if (drawingTool === 'brush') {
                                setShowToolSettings(!showToolSettings);
                            } else {
                                setShowToolSettings(true);
                            }
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${drawingTool === 'brush'
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-neutral-700 text-neutral-400'
                            }`}
                        title={t('brush')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                    </button>

                    {/* Brush Settings Panel */}
                    {showToolSettings && drawingTool === 'brush' && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#2a2a2a] border border-neutral-600 rounded-xl p-4 shadow-2xl z-50 min-w-[200px]">
                            {/* Brush Width */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-sm text-neutral-300 mb-2">
                                    <span>{t('brushWidth')}</span>
                                    <span>{brushWidth}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={brushWidth}
                                    onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Preset Colors */}
                            <div className="mb-3">
                                <div className="text-sm text-neutral-300 mb-2">{t('presetColors')}</div>
                                <div className="flex gap-2">
                                    {presetColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setBrushColor(color)}
                                            className={`w-8 h-8 rounded-lg border-2 transition-all ${brushColor === color
                                                ? 'border-white scale-110'
                                                : 'border-transparent hover:border-neutral-500'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Custom Color */}
                            <div>
                                <div className="text-sm text-neutral-300 mb-2">{t('customColor')}</div>
                                <input
                                    type="color"
                                    value={brushColor}
                                    onChange={(e) => setBrushColor(e.target.value)}
                                    className="w-full h-10 rounded-lg cursor-pointer border border-neutral-600"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Eraser Button with Settings Panel */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setDrawingTool('eraser');
                            if (drawingTool === 'eraser') {
                                setShowToolSettings(!showToolSettings);
                            } else {
                                setShowToolSettings(true);
                            }
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${drawingTool === 'eraser'
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-neutral-700 text-neutral-400'
                            }`}
                        title={t('eraser')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                            <path d="M22 21H7" />
                            <path d="m5 11 9 9" />
                        </svg>
                    </button>

                    {/* Eraser Settings Panel */}
                    {showToolSettings && drawingTool === 'eraser' && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#2a2a2a] border border-neutral-600 rounded-xl p-4 shadow-2xl z-50 min-w-[200px]">
                            {/* Eraser Width */}
                            <div>
                                <div className="flex items-center justify-between text-sm text-neutral-300 mb-2">
                                    <span>{t('eraserWidth')}</span>
                                    <span>{eraserWidth}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={eraserWidth}
                                    onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
