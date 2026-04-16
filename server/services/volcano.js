/**
 * volcano.js
 * 
 * Volcano Engine (火山方舟) API service for video generation.
 * Supports Seedance series models via Doubao/Volcano API.
 * 
 * API Format:
 * - Creation: POST /contents/generations/tasks
 * - Query: GET /contents/generations/tasks/{task_id}
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

// Task endpoints
const TASK_CREATE_ENDPOINT = '/contents/generations/tasks';
const TASK_QUERY_ENDPOINT = '/contents/generations/tasks';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract raw base64 from data URL (removes data:image/xxx;base64, prefix)
 */
function extractRawBase64(dataUrl) {
    if (!dataUrl) return null;
    if (dataUrl.startsWith('data:')) {
        return dataUrl.replace(/^data:[^;]+;base64,/, '');
    }
    return dataUrl;
}

/**
 * Map frontend model ID to Volcano API model name
 */
function mapVolcanoVideoModelName(modelId) {
    const mapping = {
        'seedance-2.0': 'doubao-seedance-2-0-260128',
        'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
        'seedance-1.5-pro': 'doubao-seedance-1-5-pro-251215',
        'seedance-1.0-pro': 'doubao-seedance-1-0-pro',
        'seedance-1.0-lite': 'doubao-seedance-1-0-lite'
    };
    return mapping[modelId] || 'doubao-seedance-2-0-260128';
}

/**
 * Map duration to Volcano supported values
 */
function mapDuration(duration) {
    const numDuration = parseInt(duration || 5);
    // Seedance 2.0 supports: 5, 10, 11 seconds
    const validDurations = [5, 10, 11];
    if (validDurations.includes(numDuration)) {
        return numDuration;
    }
    // Find closest
    return validDurations.reduce((prev, curr) => 
        Math.abs(curr - numDuration) < Math.abs(prev - numDuration) ? curr : prev
    );
}

// ============================================================================
// POLLING
// ============================================================================

/**
 * Poll Volcano video task status until complete
 */
async function pollVolcanoVideoTask(taskId, baseUrl, apiKey, maxWaitMs = 600000) {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    console.log(`[Volcano] Starting poll for task ${taskId}`);

    while (Date.now() - startTime < maxWaitMs) {
        const response = await fetch(`${baseUrl}${TASK_QUERY_ENDPOINT}/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
            throw new Error(`Volcano API empty poll response (status: ${response.status})`);
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Volcano API invalid JSON poll response: ${responseText.substring(0, 200)}`);
        }

        if (!response.ok) {
            const errorMsg = result.error?.message || result.error?.code || responseText;
            throw new Error(`Volcano API poll error ${response.status}: ${errorMsg}`);
        }

        const status = result.status;
        console.log(`[Volcano] Task ${taskId} status: ${status}`);

        if (status === 'succeeded') {
            // Get video URL from content
            const videoUrl = result.content?.video_url;
            if (!videoUrl) {
                throw new Error('No video URL in successful response');
            }
            return videoUrl;
        } else if (status === 'failed') {
            let errorMsg = result.error ?? result.message ?? 'Unknown error';
            if (typeof errorMsg === 'object' && errorMsg) {
                errorMsg = errorMsg.message || errorMsg.code || JSON.stringify(errorMsg);
            }
            throw new Error(`Volcano generation failed: ${errorMsg}`);
        }

        // pending or processing - keep waiting
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Volcano generation timed out');
}

// ============================================================================
// VIDEO GENERATION
// ============================================================================

/**
 * Generate video using Volcano Engine (Seedance)
 * 
 * Advanced Parameters:
 * - seed: Random seed for reproducibility (integer)
 * - camera_fixed: Whether to fix camera movement (boolean, default: false)
 * - generate_audio: Whether to generate audio (boolean, default: true)
 * - watermark: Whether to add watermark (boolean, default: false)
 * - return_last_frame: Whether to return the last frame (boolean, default: false)
 */
export async function generateVolcanoVideo({
    prompt,
    imageBase64,
    lastFrameBase64,
    styleReferenceBase64,
    modelId,
    aspectRatio,
    resolution,
    duration,
    seed,
    cameraFixed,
    generateAudio,
    watermark,
    returnLastFrame,
    portraitAssetId,
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    if (!apiKey) {
        throw new Error('Volcano API key not configured');
    }

    const modelName = mapVolcanoVideoModelName(modelId);
    const mappedDuration = mapDuration(duration);

    // Build content array (Volcano API format)
    const content = [];

    // Add text prompt
    if (prompt) {
        content.push({
            type: 'text',
            text: prompt
        });
    }

    // Helper function to add image to content array
    const addImageToContent = (base64Data, role) => {
        if (!base64Data) return;
        const rawBase64 = extractRawBase64(base64Data) || base64Data;
        if (base64Data.startsWith('http://') || base64Data.startsWith('https://') || base64Data.startsWith('asset://')) {
            content.push({
                type: 'image_url',
                image_url: { url: base64Data },
                role: role
            });
        } else {
            const mimeType = base64Data.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
            content.push({
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${rawBase64}` },
                role: role
            });
        }
    };

    // Add images with appropriate roles based on what is provided
    // IMPORTANT: Volcano API has strict rules for image roles:
    // - reference_image: First frame for image-to-video (I2V)
    // - end_frame_image: End frame for frame-to-video (FL2V)
    // - style_reference_image: Style reference (multimodal)
    // 
    // The API only accepts ONE primary image type (reference_image OR end_frame_image)
    // NOT both in the same request
    
    // Determine the video generation mode based on available images
    const hasFirstFrame = !!imageBase64;
    const hasEndFrame = !!lastFrameBase64;
    const hasStyleRef = !!styleReferenceBase64;
    
    // Add style reference image first (always allowed, doesn't conflict)
    if (hasStyleRef) {
        addImageToContent(styleReferenceBase64, 'style_reference_image');
    }
    
    // Handle first/end frame - use FIRST frame if available, ignore end frame
    // This matches standard image-to-video behavior
    if (hasFirstFrame) {
        // Image-to-video mode: use reference_image
        addImageToContent(imageBase64, 'reference_image');
    } else if (hasEndFrame) {
        // End frame mode: use end_frame_image
        addImageToContent(lastFrameBase64, 'end_frame_image');
    }

    // Build request body
    const body = {
        model: modelName,
        content: content,
        ratio: aspectRatio === 'Auto' ? '16:9' : aspectRatio,
        duration: mappedDuration,
        generate_audio: generateAudio !== undefined ? generateAudio : true,
        watermark: watermark !== undefined ? watermark : false
    };

    // Add advanced parameters to extra_body (Seedance 2.0 API)
    const extraBody = {};
    
    // Random seed for reproducibility
    if (seed !== undefined && seed !== null) {
        extraBody.seed = parseInt(seed);
    }
    
    // Camera fixed mode
    if (cameraFixed !== undefined) {
        extraBody.camera_fixed = !!cameraFixed;
    }
    
    // Return last frame
    if (returnLastFrame !== undefined) {
        extraBody.return_last_frame = !!returnLastFrame;
    }

    // Portrait asset parameter (Seedance 2.0 API)
    if (portraitAssetId) {
        extraBody.portrait_asset_id = portraitAssetId;
    }
    
    // Add extra_body only if there are advanced parameters
    if (Object.keys(extraBody).length > 0) {
        body.extra_body = extraBody;
    }

    console.log('=== Volcano Video Generation ===');
    console.log('Model:', modelName);
    console.log('Base URL:', baseUrl);
    console.log('Has first frame:', !!imageBase64);
    console.log('Has last frame:', !!lastFrameBase64);
    console.log('Has style reference:', !!styleReferenceBase64);
    console.log('Duration:', mappedDuration);
    console.log('Ratio:', body.ratio);
    console.log('Prompt:', (prompt || '').substring(0, 100) + '...');

    // Create task
    const requestUrl = `${baseUrl}${TASK_CREATE_ENDPOINT}`;
    console.log('[Volcano] Request URL:', requestUrl);
    
    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
        throw new Error(`Volcano API empty response (status: ${response.status})`);
    }

    let result;
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Volcano API invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    // Log full response for debugging
    console.log('[Volcano] Task creation response:', JSON.stringify(result, null, 2));

    // Handle error response
    if (result.error) {
        let errorMsg = result.error;
        if (typeof errorMsg === 'object') {
            errorMsg = errorMsg.message || errorMsg.code || JSON.stringify(errorMsg);
        }
        throw new Error(`Volcano API error: ${errorMsg}`);
    }

    if (!response.ok) {
        throw new Error(`Volcano API HTTP error ${response.status}: ${responseText}`);
    }

    const taskId = result.id;
    if (!taskId) {
        throw new Error('No task ID returned from Volcano API');
    }

    console.log(`[Volcano] Task created: ${taskId}`);

    // Poll for completion
    const videoUrl = await pollVolcanoVideoTask(taskId, baseUrl, apiKey);

    console.log(`[Volcano] Video URL: ${videoUrl}`);
    return videoUrl;
}

/**
 * Generate image using Volcano Engine
 * Note: Volcano primarily focuses on video generation
 */
export async function generateVolcanoImage({
    prompt,
    imageBase64,
    modelId,
    aspectRatio,
    resolution,
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    if (!apiKey) {
        throw new Error('Volcano API key not configured');
    }

    console.log('=== Volcano Image Generation ===');
    console.log('Model:', modelId || 'default');
    console.log('Has reference:', !!imageBase64);
    console.log('Prompt:', (prompt || '').substring(0, 100) + '...');

    throw new Error('Volcano image generation not implemented. Use Seedance for video generation.');
}
