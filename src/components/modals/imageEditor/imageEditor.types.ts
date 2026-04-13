/**
 * imageEditor.types.ts
 * 
 * Shared types and constants for the Image Editor modal.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Arrow element for annotations
 */
export interface ArrowElement {
    id: string;
    type: 'arrow';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    lineWidth: number;
}

/**
 * Text element for annotations
 */
export interface TextElement {
    id: string;
    type: 'text';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    fontFamily: string;
}

/**
 * Union type for all drawable elements
 */
export type EditorElement = ArrowElement | TextElement;

/**
 * Snapshot of editor state for undo/redo
 */
export interface HistoryState {
    canvasData: string | null; // Base64 image data of brush canvas
    elements: EditorElement[];
    imageUrl?: string; // Current image URL (for crop undo/redo)
}

/**
 * Props for the main ImageEditorModal component
 */
export interface ImageEditorModalProps {
    isOpen: boolean;
    nodeId: string;
    imageUrl?: string;
    initialPrompt?: string;
    initialModel?: string;
    initialAspectRatio?: string;
    initialResolution?: string;
    initialElements?: EditorElement[];
    initialCanvasData?: string;
    initialCanvasSize?: { width: number; height: number };
    initialBackgroundUrl?: string; // Original/clean image for editing
    onClose: () => void;
    onGenerate: (id: string, prompt: string, count: number) => void;
    onUpdate: (id: string, updates: any) => void;
}

/**
 * Image model configuration
 */
export interface ImageModel {
    id: string;
    name: string;
    provider: 'google' | 'kling' | 'openai' | 'seedream';
    supportsImageToImage: boolean;
    supportsMultiImage: boolean;
    recommended?: boolean;
    resolutions: string[];
    aspectRatios: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available image generation models
 * Note: Only kling-v1-5 supports single-image reference via image_reference parameter
 * Note: Kling V2/V2.1 only support references via Multi-Image API
 */
export const IMAGE_MODELS: ImageModel[] = [
    { id: 'gpt-image-1.5', name: 'GPT Image 1.5', provider: 'openai', supportsImageToImage: true, supportsMultiImage: true, recommended: true, resolutions: ["Auto", "1K", "2K", "4K"], aspectRatios: ["Auto", "1024x1024", "1536x1024", "1024x1536"] },
    { id: 'gemini-pro', name: 'Nano Banana Pro', provider: 'google', supportsImageToImage: true, supportsMultiImage: true, resolutions: ["1K", "2K", "4K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"] },
    // Kling AI models - Consolidated: removed legacy v1, v2, v2-new
    { id: 'kling-v1-5', name: 'Kling V1.5', provider: 'kling', supportsImageToImage: true, supportsMultiImage: false, resolutions: ["1K", "2K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"] },
    { id: 'kling-v2-1', name: 'Kling V2.1', provider: 'kling', supportsImageToImage: false, supportsMultiImage: true, recommended: true, resolutions: ["1K", "2K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"] },
    // Seedream models (ByteDance/火山引擎) - 支持中文字理解
    { id: 'seedream-4.5', name: 'Seedream 4.5', provider: 'seedream', supportsImageToImage: true, supportsMultiImage: true, resolutions: ["1K", "2K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3"] },
    { id: 'seedream-4.6', name: 'Seedream 4.6', provider: 'seedream', supportsImageToImage: true, supportsMultiImage: true, recommended: true, resolutions: ["1K", "2K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3"] },
    { id: 'seedream-5.0', name: 'Seedream 5.0', provider: 'seedream', supportsImageToImage: true, supportsMultiImage: true, resolutions: ["1K", "2K", "4K"], aspectRatios: ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3"] },
];

/**
 * Preset brush colors
 */
export const PRESET_COLORS = ['#ff0000', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];
