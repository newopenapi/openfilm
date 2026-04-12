/**
 * fal.js
 * 
 * Fal.ai API service for Kling 2.6 motion control.
 * Uses the official @fal-ai/client which handles file uploads automatically.
 */

import { fal } from '@fal-ai/client';
import sharp from 'sharp';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MOTION_CONTROL_MODEL = 'fal-ai/kling-video/v2.6/pro/motion-control';
const IMAGE_TO_VIDEO_MODEL = 'fal-ai/kling-video/v2.6/pro/image-to-video';

// Fal.ai upload limit is 10MB
const MAX_FILE_SIZE = 9 * 1024 * 1024; // 9MB to be safe (under 10MB limit)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert base64 data URI to a Buffer
 */
function base64ToBuffer(base64Data) {
    let rawBase64 = base64Data;

    if (base64Data.startsWith('data:')) {
        const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            rawBase64 = match[2];
        }
    }

    return Buffer.from(rawBase64, 'base64');
}

/**
 * Compress an image buffer to fit within size and dimension limits
 * Uses sharp to resize and compress the image
 * 
 * Fal.ai limits:
 * - Max file size: 10MB
 * - Max dimensions: 3850x3850 pixels
 */
async function compressImage(imageBuffer, targetSize = MAX_FILE_SIZE) {
    const originalSize = imageBuffer.length;
    const MAX_DIMENSION = 3840; // Just under 3850 to be safe

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    let { width, height } = metadata;

    console.log(`[Fal.ai] Original image: ${width}x${height}, ${Math.round(originalSize / 1024)} KB`);

    // Step 1: Resize if dimensions exceed the limit
    let workingBuffer = imageBuffer;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);

        console.log(`[Fal.ai] Resizing from ${width}x${height} to ${newWidth}x${newHeight} (max ${MAX_DIMENSION})`);

        workingBuffer = await sharp(imageBuffer)
            .resize(newWidth, newHeight, { fit: 'inside' })
            .jpeg({ quality: 90 })
            .toBuffer();

        width = newWidth;
        height = newHeight;
        console.log(`[Fal.ai] After resize: ${Math.round(workingBuffer.length / 1024)} KB`);
    }

    // Step 2: Check if file size is OK
    if (workingBuffer.length <= targetSize) {
        console.log(`[Fal.ai] Image size OK: ${Math.round(workingBuffer.length / 1024)} KB`);
        return workingBuffer;
    }

    console.log(`[Fal.ai] Image still too large (${Math.round(workingBuffer.length / 1024)} KB), compressing further...`);

    // Step 3: Progressively compress until under the size limit
    let quality = 80;
    let scale = 1.0;
    let compressed = workingBuffer;

    for (let attempt = 0; attempt < 5; attempt++) {
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);

        compressed = await sharp(workingBuffer)
            .resize(newWidth, newHeight, { fit: 'inside' })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();

        console.log(`[Fal.ai] Compression attempt ${attempt + 1}: ${Math.round(compressed.length / 1024)} KB (${newWidth}x${newHeight}, quality: ${quality})`);

        if (compressed.length <= targetSize) {
            break;
        }

        // Reduce quality and scale for next attempt
        quality = Math.max(50, quality - 10);
        scale = scale * 0.8;
    }

    console.log(`[Fal.ai] Final size: ${Math.round(compressed.length / 1024)} KB (from ${Math.round(originalSize / 1024)} KB)`);

    return compressed;
}

/**
 * Convert base64 data URI to a Blob/File for fal.ai upload
 * Includes compression for large images (size and dimensions)
 */
async function base64ToBlob(base64Data, fileType = 'image') {
    let buffer = base64ToBuffer(base64Data);

    // Determine mime type
    let mimeType = fileType === 'video' ? 'video/mp4' : 'image/png';

    if (base64Data.startsWith('data:')) {
        const match = base64Data.match(/^data:([^;]+);base64,/);
        if (match) {
            mimeType = match[1];
        }
    }

    // Process all images through compressImage to check both size AND dimensions
    // The compressImage function handles Fal.ai limits:
    // - Max file size: 10MB
    // - Max dimensions: 3850x3850 pixels
    if (fileType === 'image') {
        buffer = await compressImage(buffer);
        mimeType = 'image/jpeg'; // Processed images are JPEG
    }

    // Create a Blob-like object that fal.ai client can handle
    return new Blob([buffer], { type: mimeType });
}

// ============================================================================
// MOTION CONTROL
// ============================================================================

/**
 * Generate video using Fal.ai Kling 2.6 Motion Control
 * 
 * @param {Object} params
 * @param {string} params.prompt - Text prompt
 * @param {string} params.characterImageBase64 - Base64 character reference image (or data URI)
 * @param {string} params.motionVideoBase64 - Base64 motion reference video (or data URI)
 * @param {string} params.characterOrientation - 'image' or 'video' (default: 'video')
 * @param {boolean} params.keepOriginalSound - Keep audio from reference video (default: true per API)
 * @param {string} params.apiKey - Fal.ai API key
 * @param {string} [params.baseUrl] - Optional custom API base URL (for proxies)
 * @returns {Promise<string>} URL of the generated video
 */
export async function generateFalMotionControl({
    prompt,
    characterImageBase64,
    motionVideoBase64,
    characterOrientation = 'video',
    keepOriginalSound = true, // Match API default
    apiKey,
    baseUrl
}) {
    console.log('\n========================================');
    console.log('[Fal.ai Motion Control] Starting generation');
    console.log(`[Fal.ai Motion Control] Parameters:`);
    console.log(`  - Prompt: ${prompt ? prompt.substring(0, 50) + '...' : '(none)'}`);
    console.log(`  - Character Image: ${characterImageBase64 ? 'YES' : 'NO'}`);
    console.log(`  - Motion Video: ${motionVideoBase64 ? 'YES' : 'NO'}`);
    console.log(`  - Character Orientation: ${characterOrientation}`);
    console.log(`  - Keep Original Sound: ${keepOriginalSound}`);
    console.log(`  - Custom Base URL: ${baseUrl || 'Official (queue.fal.run)'}`);
    console.log('========================================\n');

    if (!apiKey) {
        throw new Error('[Fal.ai Motion Control] FAL_API_KEY is required');
    }
    if (!characterImageBase64) {
        throw new Error('[Fal.ai Motion Control] Character image is required');
    }
    if (!motionVideoBase64) {
        throw new Error('[Fal.ai Motion Control] Motion reference video is required');
    }

    // Configure fal client with API key and optional custom base URL
    const falConfig = { credentials: apiKey };
    if (baseUrl) {
        falConfig.baseUrl = baseUrl;
    }
    fal.config(falConfig);

    // Upload files to fal.ai storage (with compression for large images)
    console.log('[Fal.ai Motion Control] Processing and uploading files to fal.ai storage...');

    const imageBlob = await base64ToBlob(characterImageBase64, 'image');
    const videoBlob = await base64ToBlob(motionVideoBase64, 'video');

    console.log(`[Fal.ai] Image blob size: ${Math.round(imageBlob.size / 1024)} KB`);
    console.log(`[Fal.ai] Video blob size: ${Math.round(videoBlob.size / 1024)} KB`);

    const [imageUrl, videoUrl] = await Promise.all([
        fal.storage.upload(imageBlob).then(url => {
            console.log(`[Fal.ai] Image uploaded: ${url}`);
            return url;
        }),
        fal.storage.upload(videoBlob).then(url => {
            console.log(`[Fal.ai] Video uploaded: ${url}`);
            return url;
        })
    ]);

    // Prepare input - match the official API schema from docs
    const input = {
        image_url: imageUrl,
        video_url: videoUrl,
        keep_original_sound: keepOriginalSound,
        character_orientation: characterOrientation
    };

    // Add prompt if provided (optional per docs)
    if (prompt) {
        input.prompt = prompt;
    }

    console.log('[Fal.ai Motion Control] Submitting request...');
    console.log('[Fal.ai Motion Control] Full input:', JSON.stringify(input, null, 2));

    // Track last status to avoid duplicate logs
    let lastStatus = '';

    // Submit and wait for result using fal.subscribe
    let result;
    try {
        result = await fal.subscribe(MOTION_CONTROL_MODEL, {
            input,
            logs: true,
            onQueueUpdate: (update) => {
                // Only log when status changes
                if (update.status !== lastStatus) {
                    console.log(`[Fal.ai] Status: ${update.status}`);
                    lastStatus = update.status;
                }
                // Log actual progress messages if available
                if (update.status === 'IN_PROGRESS' && update.logs && update.logs.length > 0) {
                    update.logs.map((log) => log.message).forEach(msg => {
                        if (msg) console.log(`[Fal.ai Log] ${msg}`);
                    });
                }
            }
        });
    } catch (falError) {
        console.error('[Fal.ai Motion Control] Error details:');
        console.error('  Status:', falError.status);
        console.error('  Body:', JSON.stringify(falError.body, null, 2));
        console.error('  Request ID:', falError.requestId);
        throw falError;
    }

    // Extract video URL from result
    const resultVideoUrl = result.data?.video?.url;
    if (!resultVideoUrl) {
        console.log('[Fal.ai Motion Control] Full result:', JSON.stringify(result, null, 2));
        throw new Error('No video URL in Fal.ai result');
    }

    console.log('\n========================================');
    console.log('[Fal.ai Motion Control] SUCCESS!');
    console.log(`[Fal.ai Motion Control] Video URL: ${resultVideoUrl}`);
    console.log('========================================\n');

    return resultVideoUrl;
}

// ============================================================================
// IMAGE TO VIDEO (Kling 2.6)
// ============================================================================

/**
 * Generate video from image using Fal.ai Kling 2.6 Image-to-Video
 * 
 * @param {Object} params
 * @param {string} params.prompt - Text prompt (optional)
 * @param {string} params.imageBase64 - Base64 image (or data URI)
 * @param {string} params.duration - Video duration: "5" or "10" (default: "5")
 * @param {boolean} params.generateAudio - Whether to generate native audio (default: true)
 * @param {string} params.apiKey - Fal.ai API key
 * @param {string} [params.baseUrl] - Optional custom API base URL (for proxies)
 * @returns {Promise<string>} URL of the generated video
 */
export async function generateFalImageToVideo({
    prompt,
    imageBase64,
    duration = '5',
    generateAudio = true,
    apiKey,
    baseUrl
}) {
    console.log('\n========================================');
    console.log('[Fal.ai Image-to-Video] Starting Kling 2.6 generation');
    console.log(`[Fal.ai Image-to-Video] Parameters:`);
    console.log(`  - Prompt: ${prompt ? prompt.substring(0, 50) + '...' : '(none)'}`);
    console.log(`  - Image: ${imageBase64 ? 'YES' : 'NO'}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Generate Audio: ${generateAudio}`);
    console.log(`  - Custom Base URL: ${baseUrl || 'Official (queue.fal.run)'}`);
    console.log('========================================\n');

    if (!apiKey) {
        throw new Error('[Fal.ai Image-to-Video] FAL_API_KEY is required');
    }
    if (!imageBase64) {
        throw new Error('[Fal.ai Image-to-Video] Image is required');
    }

    // Configure fal client with API key and optional custom base URL
    const falConfig = { credentials: apiKey };
    if (baseUrl) {
        falConfig.baseUrl = baseUrl;
    }
    fal.config(falConfig);

    // Upload image to fal.ai storage (with compression for large images)
    console.log('[Fal.ai Image-to-Video] Processing and uploading image...');

    const imageBlob = await base64ToBlob(imageBase64, 'image');
    console.log(`[Fal.ai] Image blob size: ${Math.round(imageBlob.size / 1024)} KB`);

    const imageUrl = await fal.storage.upload(imageBlob);
    console.log(`[Fal.ai] Image uploaded: ${imageUrl}`);

    // Prepare input
    const input = {
        image_url: imageUrl,
        duration: String(duration),
        generate_audio: generateAudio,
        negative_prompt: 'blur, distort, and low quality'
    };

    // Add prompt if provided
    if (prompt) {
        input.prompt = prompt;
    }

    console.log('[Fal.ai Image-to-Video] Submitting request...');
    console.log('[Fal.ai Image-to-Video] Input:', JSON.stringify(input, null, 2));

    // Track last status to avoid duplicate logs
    let lastStatus = '';

    // Submit and wait for result
    let result;
    try {
        result = await fal.subscribe(IMAGE_TO_VIDEO_MODEL, {
            input,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status !== lastStatus) {
                    console.log(`[Fal.ai] Status: ${update.status}`);
                    lastStatus = update.status;
                }
                if (update.status === 'IN_PROGRESS' && update.logs && update.logs.length > 0) {
                    update.logs.map((log) => log.message).forEach(msg => {
                        if (msg) console.log(`[Fal.ai Log] ${msg}`);
                    });
                }
            }
        });
    } catch (falError) {
        console.error('[Fal.ai Image-to-Video] Error details:');
        console.error('  Status:', falError.status);
        console.error('  Body:', JSON.stringify(falError.body, null, 2));
        console.error('  Request ID:', falError.requestId);
        throw falError;
    }

    // Extract video URL from result
    const resultVideoUrl = result.data?.video?.url;
    if (!resultVideoUrl) {
        console.log('[Fal.ai Image-to-Video] Full result:', JSON.stringify(result, null, 2));
        throw new Error('No video URL in Fal.ai result');
    }

    console.log('\n========================================');
    console.log('[Fal.ai Image-to-Video] SUCCESS!');
    console.log(`[Fal.ai Image-to-Video] Video URL: ${resultVideoUrl}`);
    console.log('========================================\n');

    return resultVideoUrl;
}
