/**
 * ImageEditorModal.tsx
 * 
 * Full-screen image editor modal with drawing tools, model selection,
 * and image generation controls. Refactored into modular components.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { t } from '../../i18n';

// Types and constants
import {
    ImageEditorModalProps,
    EditorElement,
    IMAGE_MODELS
} from './imageEditor/imageEditor.types';

// Custom hooks
import { useImageEditorHistory } from '../../hooks/useImageEditorHistory';
import { useImageEditorDrawing } from '../../hooks/useImageEditorDrawing';
import { useImageEditorArrows, drawArrowWithStyle } from '../../hooks/useImageEditorArrows';
import { uploadAsset } from '../../services/assetService';
import { useImageEditorSelection } from '../../hooks/useImageEditorSelection';
import { useImageEditorText } from '../../hooks/useImageEditorText';
import { useImageEditorCrop } from '../../hooks/useImageEditorCrop';

// Sub-components
import { DrawingToolbar } from './imageEditor/DrawingToolbar';
import { BottomToolbar } from './imageEditor/BottomToolbar';
import { PromptBar } from './imageEditor/PromptBar';

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    isOpen,
    nodeId,
    imageUrl,
    initialPrompt,
    initialModel,
    initialAspectRatio,
    initialResolution,
    initialElements,
    initialCanvasData,
    initialBackgroundUrl,
    onClose,
    onGenerate,
    onUpdate
}) => {
    // --- Prompt & Generation State ---
    const [prompt, setPrompt] = useState(initialPrompt || '');
    const [batchCount, setBatchCount] = useState(4);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showAspectDropdown, setShowAspectDropdown] = useState(false);
    const [showResolutionDropdown, setShowResolutionDropdown] = useState(false);

    // --- Model State ---
    const [selectedModel, setSelectedModel] = useState(initialModel || 'gemini-pro');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState(initialAspectRatio || 'Auto');
    const [selectedResolution, setSelectedResolution] = useState(initialResolution || '1K');

    // --- Element State (persisted to node) ---
    const [elements, setElements] = useState<EditorElement[]>(initialElements || []);

    // --- Image State (for crop undo/redo) ---
    const [localImageUrl, setLocalImageUrl] = useState<string | undefined>(imageUrl);

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const arrowCanvasRef = useRef<HTMLCanvasElement>(null);
    const selectCanvasRef = useRef<HTMLCanvasElement>(null);
    const textCanvasRef = useRef<HTMLCanvasElement>(null);
    const elementsCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // --- Custom Hooks ---

    const {
        historyStack,
        redoStack,
        saveState,
        handleUndo,
        handleRedo
    } = useImageEditorHistory({
        canvasRef,
        elements,
        setElements,
        setSelectedElementId: (id) => selection.setSelectedElementId(id),
        isOpen,
        imageUrl: localImageUrl,
        setImageUrl: setLocalImageUrl,
        onImageUrlChange: (url) => onUpdate(nodeId, { resultUrl: url })
    });

    const drawing = useImageEditorDrawing({
        canvasRef,
        imageRef,
        saveState
    });

    const arrows = useImageEditorArrows({
        arrowCanvasRef,
        imageRef,
        saveState,
        setElements
    });

    const selection = useImageEditorSelection({
        selectCanvasRef,
        elements,
        setElements,
        saveState
    });

    const text = useImageEditorText({
        imageRef,
        saveState,
        setElements
    });

    // Helper to generate composite image (Background + Brush + Elements)
    const generateCompositeImage = useCallback(async () => {
        if (!imageRef.current) return null;

        const width = imageRef.current.clientWidth;
        const height = imageRef.current.clientHeight;

        // Create a temporary canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Draw Background Image
        if (localImageUrl) {
            await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = localImageUrl;
            });
        }

        // 2. Draw Brush Layer
        if (canvasRef.current) {
            ctx.drawImage(canvasRef.current, 0, 0, width, height);
        }

        // 3. Draw Elements (Arrows/Text)
        elements.forEach(element => {
            if (element.type === 'arrow') {
                drawArrowWithStyle(
                    ctx,
                    element.startX,
                    element.startY,
                    element.endX,
                    element.endY,
                    element.color,
                    element.lineWidth
                );
            } else if (element.type === 'text') {
                ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textBaseline = 'top';
                ctx.fillText(element.text, element.x, element.y);
            }
        });

        return canvas.toDataURL('image/png');
    }, [elements, localImageUrl]);

    // Helper to persist canvas brush data AND composite image to node
    const saveCanvasToNode = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !nodeId) return;

        // 1. Get Brush Layer
        const canvasData = canvas.toDataURL('image/png');

        let savedCanvasDataUrl = canvasData;
        let savedCompositeUrl = '';
        let savedBackgroundUrl = localImageUrl || '';

        try {
            // Upload Brush Layer (if it has content)
            savedCanvasDataUrl = await uploadAsset(canvasData, 'image', 'brush-layer');

            // 2. Generate and Upload Composite
            const compositeDataUrl = await generateCompositeImage();
            if (compositeDataUrl) {
                savedCompositeUrl = await uploadAsset(compositeDataUrl, 'image', 'composite-result');
            }

            // 3. Upload Background if it's base64 (clean crop or initial upload)
            if (localImageUrl && localImageUrl.startsWith('data:')) {
                savedBackgroundUrl = await uploadAsset(localImageUrl, 'image', 'clean-background');
                // Update local state to use the new URL locally too
                setLocalImageUrl(savedBackgroundUrl);
            }
        } catch (error) {
            console.error("Failed to upload assets during save:", error);
            // Fallback: continue with what we have (base64)
            if (!savedCompositeUrl) {
                const fallbackComposite = await generateCompositeImage();
                if (fallbackComposite) savedCompositeUrl = fallbackComposite;
            }
        }

        // Save URLs + size
        const updates: any = {
            editorCanvasData: savedCanvasDataUrl,
            editorCanvasSize: { width: canvas.width, height: canvas.height }
        };

        if (savedCompositeUrl) {
            updates.resultUrl = savedCompositeUrl;
            if (savedBackgroundUrl) {
                updates.editorBackgroundUrl = savedBackgroundUrl;
            }
        }

        onUpdate(nodeId, updates);
    }, [nodeId, onUpdate, generateCompositeImage, localImageUrl]);



    const handleCropApply = async (croppedImageDataUrl: string) => {
        // Update local preview immediately
        setLocalImageUrl(croppedImageDataUrl);

        try {
            // Upload the cropped image
            const savedCropUrl = await uploadAsset(croppedImageDataUrl, 'image', 'crop-result');

            // Update local state with server URL
            setLocalImageUrl(savedCropUrl);

            // Save clean crop as background and initial result
            onUpdate(nodeId, {
                resultUrl: savedCropUrl,
                editorBackgroundUrl: savedCropUrl
            });
        } catch (error) {
            console.error("Failed to upload crop:", error);
            // Fallback
            onUpdate(nodeId, {
                resultUrl: croppedImageDataUrl,
                editorBackgroundUrl: croppedImageDataUrl
            });
        }
    };

    const crop = useImageEditorCrop({
        imageRef,
        saveState,
        onCropApply: handleCropApply
    });

    const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel) || IMAGE_MODELS[0];
    const hasInputImage = !!imageUrl;

    // --- Effects ---

    // Track if we've initialized for this node to prevent re-initialization loops
    const initializedNodeIdRef = useRef<string | null>(null);
    const hasInitializedRef = useRef(false);

    // Reset state when modal opens with a NEW node (not when our own updates change initialElements)
    useEffect(() => {
        // Only initialize if modal is open AND we haven't initialized for this node yet
        if (!isOpen) {
            // Reset initialization flag when modal closes
            hasInitializedRef.current = false;
            initializedNodeIdRef.current = null;
            return;
        }

        // Skip if we've already initialized for this node
        if (hasInitializedRef.current && initializedNodeIdRef.current === nodeId) {
            return;
        }

        // Initialize state from props
        setPrompt(initialPrompt || '');
        setSelectedModel(initialModel || 'gemini-pro');
        setSelectedAspectRatio(initialAspectRatio || 'Auto');
        setSelectedResolution(initialResolution || '1K');
        // Use initialBackgroundUrl (clean image) if available, otherwise imageUrl (might be composite or input)
        setLocalImageUrl(initialBackgroundUrl || imageUrl);
        setElements(initialElements || []);

        hasInitializedRef.current = true;
        initializedNodeIdRef.current = nodeId;
    }, [isOpen, nodeId, initialPrompt, initialModel, initialAspectRatio, initialResolution, imageUrl, initialElements]);

    // Restore brush canvas data from node when modal opens
    useEffect(() => {
        if (!isOpen || !initialCanvasData || !canvasRef.current || !imageRef.current) return;

        const canvas = canvasRef.current;
        const img = imageRef.current;

        // Wait for image to be ready
        const restoreCanvas = () => {
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const image = new Image();
            image.onload = () => {
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            };
            image.src = initialCanvasData;
        };

        if (img.complete) {
            restoreCanvas();
        } else {
            img.addEventListener('load', restoreCanvas, { once: true });
        }
    }, [isOpen, initialCanvasData]);

    // Persist elements to node when they change (with debounce to avoid excessive updates)
    const lastSavedElementsRef = useRef<string>('');
    useEffect(() => {
        if (!isOpen || !nodeId || !hasInitializedRef.current) return;

        const elementsJson = JSON.stringify(elements);
        // Only save if elements actually changed since last save
        if (elementsJson !== lastSavedElementsRef.current) {
            lastSavedElementsRef.current = elementsJson;

            const saveUpdate = async () => {
                const updates: any = { editorElements: elements };

                // Also update composite image
                const compositeUrl = await generateCompositeImage();
                if (compositeUrl) {
                    try {
                        const uploadedCompositeUrl = await uploadAsset(compositeUrl, 'image', 'composite-result');
                        updates.resultUrl = uploadedCompositeUrl;
                    } catch (e) {
                        console.error("Failed to upload composite update:", e);
                        updates.resultUrl = compositeUrl; // Fallback
                    }

                    // Capture canvas size for accurate scaling in overlay
                    if (imageRef.current) {
                        updates.editorCanvasSize = {
                            width: imageRef.current.clientWidth,
                            height: imageRef.current.clientHeight
                        };
                    }
                }

                onUpdate(nodeId, updates);
            };

            saveUpdate();
        }
    }, [elements, isOpen, nodeId, onUpdate, generateCompositeImage]);

    // Persist canvas data to node on brush strokes (debounced via saveState already captures this)

    // Redraw elements canvas when elements change (for undo/redo support)
    useEffect(() => {
        const canvas = elementsCanvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        // Ensure canvas size matches image
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw all elements
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        elements.forEach(element => {
            if (element.type === 'arrow') {
                drawArrowWithStyle(
                    ctx,
                    element.startX,
                    element.startY,
                    element.endX,
                    element.endY,
                    element.color,
                    element.lineWidth
                );
            } else if (element.type === 'text' && element.id !== text.editingTextId) {
                ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textBaseline = 'top';
                ctx.fillText(element.text, element.x, element.y);
            }
        });
    }, [elements, text.editingTextId]);

    // --- Handlers ---

    const handleGenerateClick = () => {
        onUpdate(nodeId, {
            prompt,
            imageModel: selectedModel,
            aspectRatio: selectedAspectRatio,
            resolution: selectedResolution
        });
        onGenerate(nodeId, prompt, batchCount);
    };

    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        const newModel = IMAGE_MODELS.find(m => m.id === modelId);

        if (newModel?.aspectRatios && !newModel.aspectRatios.includes(selectedAspectRatio)) {
            setSelectedAspectRatio('Auto');
        }

        onUpdate(nodeId, { imageModel: modelId });
        setShowModelDropdown(false);
    };

    const handleAspectChange = (ratio: string) => {
        setSelectedAspectRatio(ratio);
        onUpdate(nodeId, { aspectRatio: ratio });
        setShowAspectDropdown(false);
    };

    const handleResolutionChange = (res: string) => {
        setSelectedResolution(res);
        onUpdate(nodeId, { resolution: res });
        setShowResolutionDropdown(false);
    };

    // --- Early Return ---
    if (!isOpen) return null;

    // --- Render ---
    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-neutral-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                    <span className="text-sm text-neutral-300">{t('imageEditor')}</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Download Button */}
                    <button
                        className="w-10 h-10 rounded hover:bg-neutral-800 flex items-center justify-center text-neutral-400"
                        title="Download"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    {/* Exit Button */}
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded hover:bg-neutral-800 flex items-center justify-center text-neutral-400"
                        title={t('exitImageEditor')}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Drawing Sub-Toolbar */}
                {drawing.isDrawingMode && (
                    <DrawingToolbar
                        drawingTool={drawing.drawingTool}
                        setDrawingTool={drawing.setDrawingTool}
                        brushWidth={drawing.brushWidth}
                        setBrushWidth={drawing.setBrushWidth}
                        eraserWidth={drawing.eraserWidth}
                        setEraserWidth={drawing.setEraserWidth}
                        brushColor={drawing.brushColor}
                        setBrushColor={drawing.setBrushColor}
                        showToolSettings={drawing.showToolSettings}
                        setShowToolSettings={drawing.setShowToolSettings}
                        presetColors={drawing.presetColors}
                    />
                )}

                <div className="w-0"></div>

                {/* Canvas Area - constrained to fit within available space */}
                <div className="flex-1 flex items-center justify-center bg-black p-4 overflow-hidden min-h-0">
                    {localImageUrl ? (
                        <div
                            ref={imageContainerRef}
                            className="relative max-w-full max-h-full flex items-center justify-center"
                            style={{ maxHeight: 'calc(100vh - 350px)' }}
                        >
                            <img
                                ref={imageRef}
                                src={localImageUrl}
                                alt="Editing"
                                className="max-w-full max-h-full object-contain"
                                style={{ maxHeight: 'calc(100vh - 350px)' }}
                                onLoad={(e) => {
                                    const img = e.currentTarget;
                                    const canvas = canvasRef.current;
                                    const arrowCanvas = arrowCanvasRef.current;
                                    const elementsCanvas = elementsCanvasRef.current;

                                    if (canvas) {
                                        canvas.width = img.clientWidth;
                                        canvas.height = img.clientHeight;
                                    }
                                    if (arrowCanvas) {
                                        arrowCanvas.width = img.clientWidth;
                                        arrowCanvas.height = img.clientHeight;
                                    }
                                    if (elementsCanvas) {
                                        elementsCanvas.width = img.clientWidth;
                                        elementsCanvas.height = img.clientHeight;
                                        // Redraw elements immediately after resize
                                        const ctx = elementsCanvas.getContext('2d');
                                        if (ctx) {
                                            ctx.clearRect(0, 0, elementsCanvas.width, elementsCanvas.height);
                                            elements.forEach(element => {
                                                if (element.type === 'arrow') {
                                                    drawArrowWithStyle(
                                                        ctx,
                                                        element.startX,
                                                        element.startY,
                                                        element.endX,
                                                        element.endY,
                                                        element.color,
                                                        element.lineWidth
                                                    );
                                                } else if (element.type === 'text' && element.id !== text.editingTextId) {
                                                    ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                                                    ctx.fillStyle = element.color;
                                                    ctx.textBaseline = 'top';
                                                    ctx.fillText(element.text, element.x, element.y);
                                                }
                                            });
                                        }
                                    }
                                }}
                            />
                            {/* Main Canvas - For persistent brush drawings */}
                            <canvas
                                ref={canvasRef}
                                className={`absolute inset-0 ${drawing.isDrawingMode ? '' : 'pointer-events-none'}`}
                                style={drawing.isDrawingMode ? {
                                    cursor: drawing.drawingTool === 'eraser'
                                        ? `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${drawing.eraserWidth}" height="${drawing.eraserWidth}" viewBox="0 0 ${drawing.eraserWidth} ${drawing.eraserWidth}"><circle cx="${drawing.eraserWidth / 2}" cy="${drawing.eraserWidth / 2}" r="${drawing.eraserWidth / 2 - 1}" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="1"/></svg>') ${drawing.eraserWidth / 2} ${drawing.eraserWidth / 2}, auto`
                                        : 'crosshair'
                                } : {}}
                                onMouseDown={drawing.isDrawingMode ? drawing.startDrawing : undefined}
                                onMouseMove={drawing.isDrawingMode ? drawing.draw : undefined}
                                onMouseUp={drawing.isDrawingMode ? () => { drawing.stopDrawing(); saveCanvasToNode(); } : undefined}
                                onMouseLeave={drawing.isDrawingMode ? () => { drawing.stopDrawing(); saveCanvasToNode(); } : undefined}
                            />
                            {/* Arrow Canvas Overlay */}
                            {arrows.isArrowMode && (
                                <canvas
                                    ref={arrowCanvasRef}
                                    className="absolute inset-0 cursor-crosshair"
                                    onMouseDown={arrows.startArrow}
                                    onMouseMove={arrows.drawArrowPreview}
                                    onMouseUp={arrows.finishArrow}
                                    onMouseLeave={arrows.finishArrow}
                                />
                            )}
                            {/* Elements Canvas - Renders all stored elements (arrows and text) */}
                            <canvas
                                ref={elementsCanvasRef}
                                className="absolute inset-0 pointer-events-none"
                            />
                            {/* Text Mode Canvas - Click to place text */}
                            {text.isTextMode && (
                                <canvas
                                    ref={(canvas) => {
                                        (textCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
                                        if (canvas && imageRef.current) {
                                            canvas.width = imageRef.current.clientWidth;
                                            canvas.height = imageRef.current.clientHeight;
                                        }
                                    }}
                                    className="absolute inset-0 cursor-text"
                                    onClick={text.handleTextCanvasClick}
                                />
                            )}
                            {/* Text Editing Overlay */}
                            {text.editingTextId && elements.filter(el => el.type === 'text' && el.id === text.editingTextId).map(el => {
                                if (el.type !== 'text') return null;
                                return (
                                    <input
                                        key={el.id}
                                        ref={textInputRef}
                                        type="text"
                                        value={el.text}
                                        onChange={(e) => text.handleTextChange(el.id, e.target.value)}
                                        onBlur={text.handleTextBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                                text.handleTextBlur();
                                            }
                                        }}
                                        autoFocus
                                        className="absolute bg-transparent border-2 border-blue-500 outline-none text-white"
                                        style={{
                                            left: el.x,
                                            top: el.y,
                                            fontSize: el.fontSize,
                                            fontFamily: el.fontFamily,
                                            color: el.color,
                                            minWidth: '50px',
                                            padding: '2px 4px'
                                        }}
                                    />
                                );
                            })}
                            {/* Select Mode Canvas */}
                            {selection.isSelectMode && (
                                <canvas
                                    ref={(canvas) => {
                                        (selectCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
                                        if (canvas && imageRef.current) {
                                            canvas.width = imageRef.current.clientWidth;
                                            canvas.height = imageRef.current.clientHeight;
                                        }
                                    }}
                                    className="absolute inset-0"
                                    style={{ cursor: selection.isDraggingElement || selection.isResizing ? 'grabbing' : 'default' }}
                                    onMouseDown={selection.handleSelectMouseDown}
                                    onMouseMove={selection.handleSelectMouseMove}
                                    onMouseUp={selection.handleSelectMouseUp}
                                    onMouseLeave={selection.handleSelectMouseUp}
                                />
                            )}
                            {/* Selection UI - Shows handles for selected element */}
                            {selection.isSelectMode && selection.selectedElementId && (
                                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                                    {elements.filter(el => el.id === selection.selectedElementId).map(el => {
                                        if (el.type === 'arrow') {
                                            return (
                                                <g key={el.id}>
                                                    <line
                                                        x1={el.startX}
                                                        y1={el.startY}
                                                        x2={el.endX}
                                                        y2={el.endY}
                                                        stroke="#3b82f6"
                                                        strokeWidth="5"
                                                        strokeDasharray="5,5"
                                                        opacity="0.6"
                                                    />
                                                    <circle
                                                        cx={el.startX}
                                                        cy={el.startY}
                                                        r="8"
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth="2"
                                                        style={{ pointerEvents: 'auto', cursor: 'grab' }}
                                                    />
                                                    <circle
                                                        cx={el.endX}
                                                        cy={el.endY}
                                                        r="8"
                                                        fill="#3b82f6"
                                                        stroke="white"
                                                        strokeWidth="2"
                                                        style={{ pointerEvents: 'auto', cursor: 'grab' }}
                                                    />
                                                </g>
                                            );
                                        }
                                        // Text selection box (future enhancement)
                                        return null;
                                    })}
                                </svg>
                            )}
                            {/* Crop Overlay */}
                            {crop.isCropMode && crop.cropRect && (
                                <div
                                    className="absolute inset-0"
                                    style={{ cursor: crop.isDragging ? 'grabbing' : 'default' }}
                                    onMouseDown={crop.handleCropMouseDown}
                                >
                                    {/* Dimmed overlay outside crop area */}
                                    <svg className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                                        <defs>
                                            <mask id="cropMask">
                                                <rect width="100%" height="100%" fill="white" />
                                                <rect
                                                    x={crop.cropRect.x}
                                                    y={crop.cropRect.y}
                                                    width={crop.cropRect.width}
                                                    height={crop.cropRect.height}
                                                    fill="black"
                                                />
                                            </mask>
                                        </defs>
                                        <rect
                                            width="100%"
                                            height="100%"
                                            fill="rgba(0, 0, 0, 0.6)"
                                            mask="url(#cropMask)"
                                        />
                                        {/* Crop selection border */}
                                        <rect
                                            x={crop.cropRect.x}
                                            y={crop.cropRect.y}
                                            width={crop.cropRect.width}
                                            height={crop.cropRect.height}
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeDasharray="5,5"
                                        />
                                        {/* Corner handles */}
                                        {/* NW */}
                                        <rect
                                            x={crop.cropRect.x - 5}
                                            y={crop.cropRect.y - 5}
                                            width="10"
                                            height="10"
                                            fill="white"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            style={{ cursor: 'nwse-resize' }}
                                        />
                                        {/* NE */}
                                        <rect
                                            x={crop.cropRect.x + crop.cropRect.width - 5}
                                            y={crop.cropRect.y - 5}
                                            width="10"
                                            height="10"
                                            fill="white"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            style={{ cursor: 'nesw-resize' }}
                                        />
                                        {/* SW */}
                                        <rect
                                            x={crop.cropRect.x - 5}
                                            y={crop.cropRect.y + crop.cropRect.height - 5}
                                            width="10"
                                            height="10"
                                            fill="white"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            style={{ cursor: 'nesw-resize' }}
                                        />
                                        {/* SE */}
                                        <rect
                                            x={crop.cropRect.x + crop.cropRect.width - 5}
                                            y={crop.cropRect.y + crop.cropRect.height - 5}
                                            width="10"
                                            height="10"
                                            fill="white"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            style={{ cursor: 'nwse-resize' }}
                                        />
                                    </svg>
                                    {/* Crop Action Buttons */}
                                    <div
                                        className="absolute flex gap-2"
                                        style={{
                                            left: crop.cropRect.x + crop.cropRect.width / 2,
                                            top: crop.cropRect.y + crop.cropRect.height + 16,
                                            transform: 'translateX(-50%)'
                                        }}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); crop.cancelCrop(); }}
                                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); crop.applyCrop(); }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-[600px] h-[400px] bg-neutral-100 rounded flex items-center justify-center">
                            <span className="text-neutral-400">{t('noImageLoaded')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full max-w-6xl px-4 pointer-events-none">
                {/* Floating Tools Palette */}
                <BottomToolbar
                    isSelectMode={selection.isSelectMode}
                    setIsSelectMode={selection.setIsSelectMode}
                    isDrawingMode={drawing.isDrawingMode}
                    setIsDrawingMode={drawing.setIsDrawingMode}
                    isArrowMode={arrows.isArrowMode}
                    setIsArrowMode={arrows.setIsArrowMode}
                    isTextMode={text.isTextMode}
                    setIsTextMode={text.setIsTextMode}
                    isCropMode={crop.isCropMode}
                    setIsCropMode={crop.setIsCropMode}
                    onCropModeEnter={crop.initializeCropRect}
                    setShowToolSettings={drawing.setShowToolSettings}
                    setSelectedElementId={selection.setSelectedElementId}
                    setDrawingTool={drawing.setDrawingTool}
                    setShowTextSettings={text.setShowTextSettings}
                    historyStackLength={historyStack.length}
                    redoStackLength={redoStack.length}
                    handleUndo={handleUndo}
                    handleRedo={handleRedo}
                />

                {/* Prompt Bar */}
                <PromptBar
                    prompt={prompt}
                    setPrompt={setPrompt}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    showModelDropdown={showModelDropdown}
                    setShowModelDropdown={setShowModelDropdown}
                    selectedAspectRatio={selectedAspectRatio}
                    onAspectChange={handleAspectChange}
                    showAspectDropdown={showAspectDropdown}
                    setShowAspectDropdown={setShowAspectDropdown}
                    selectedResolution={selectedResolution}
                    onResolutionChange={handleResolutionChange}
                    showResolutionDropdown={showResolutionDropdown}
                    setShowResolutionDropdown={setShowResolutionDropdown}
                    batchCount={batchCount}
                    setBatchCount={setBatchCount}
                    onGenerate={handleGenerateClick}
                    hasInputImage={hasInputImage}
                />
            </div>
        </div>
    );
};
