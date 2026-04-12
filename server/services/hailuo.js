/**
 * hailuo.js
 * 
 * Hailuo AI (MiniMax) API service for video generation.
 * Supports Text-to-Video, Image-to-Video, First/Last Frame, and Subject Reference.
 * 
 * API Documentation:
 * - T2V: https://platform.minimax.io/docs/api-reference/video-generation-t2v
 * - I2V: https://platform.minimax.io/docs/api-reference/video-generation-i2v
 * - FL2V: https://platform.minimax.io/docs/api-reference/video-generation-fl2v
 * - S2V: https://platform.minimax.io/docs/api-reference/video-generation-s2v
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_HAILUO_BASE_URL = 'https://api.minimax.io/v1';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map frontend model ID to MiniMax API model name
 */
function mapHailuoModelName(modelId, hasFirstFrame, hasLastFrame) {
    // For First & Last Frame mode, only MiniMax-Hailuo-02 is supported
    if (hasFirstFrame && hasLastFrame) {
        return 'MiniMax-Hailuo-02';
    }

    const mapping = {
        'hailuo-2.3': 'MiniMax-Hailuo-2.3',
        'hailuo-2.3-fast': 'MiniMax-Hailuo-2.3-Fast',
        'hailuo-02': 'MiniMax-Hailuo-02'
    };
    return mapping[modelId] || 'MiniMax-Hailuo-2.3';
}

/**
 * Map resolution to Hailuo format
 */
function mapResolution(resolution) {
    // Hailuo only supports 768P and 1080P
    // Map unsupported resolutions to closest supported option
    const mapping = {
        'Auto': '768P',
        '1080p': '1080P',
        '768p': '768P',
        '720p': '768P',  // 720P not supported, use 768P
        '512p': '768P'   // 512P not supported, use 768P
    };
    return mapping[resolution] || '768P';
}

/**
 * Map duration to Hailuo supported values (6s, 10s)
 */
function mapHailuoDuration(duration) {
    const numDuration = parseInt(duration || 6);
    // Hailuo supports 6s and 10s.
    // If request is closer to 10 (> 8), use 10. Otherwise default to 6.
    if (numDuration > 8) {
        return 10;
    }
    return 6;
}

// ============================================================================
// POLLING
// ============================================================================

/**
 * Poll Hailuo video task status until complete
 * 
 * @param taskId - Task ID from creation response
 * @param token - Bearer token
 * @param baseUrl - API base URL (optional, for proxies)
 * @param maxWaitMs - Maximum wait time (default 10 minutes)
 */
async function pollHailuoVideoTask(taskId, token, baseUrl, maxWaitMs = 600000) {
    const base = baseUrl || DEFAULT_HAILUO_BASE_URL;
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
        // Correct endpoint: /query/video_generation with task_id as query param
        const response = await fetch(`${base}/query/video_generation?task_id=${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Handle non-JSON responses
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Hailuo API returned non-JSON response:', text.substring(0, 200));
            throw new Error(`Hailuo API returned invalid response: ${text.substring(0, 100)}`);
        }

        // Check for API error
        if (result.base_resp && result.base_resp.status_code !== 0) {
            throw new Error(`Hailuo API error: ${result.base_resp.status_msg || 'Unknown error'}`);
        }

        const status = result.status;
        console.log(`Hailuo task ${taskId} status: ${status}`);

        if (status === 'Success') {
            // Get video URL from file_id
            const fileId = result.file_id;
            if (!fileId) {
                throw new Error('No file_id in successful response');
            }

            // Fetch the video file URL
            const fileResponse = await fetch(`${base}/files/retrieve?file_id=${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const fileText = await fileResponse.text();
            let fileResult;
            try {
                fileResult = JSON.parse(fileText);
            } catch (e) {
                throw new Error(`Hailuo file API returned invalid response: ${fileText.substring(0, 100)}`);
            }

            if (fileResult.base_resp && fileResult.base_resp.status_code !== 0) {
                throw new Error(`Hailuo file retrieval error: ${fileResult.base_resp.status_msg}`);
            }

            const videoUrl = fileResult.file?.download_url;
            if (!videoUrl) {
                throw new Error('No download URL in file response');
            }

            return videoUrl;
        } else if (status === 'Fail') {
            throw new Error(`Hailuo generation failed: ${result.base_resp?.status_msg || 'Unknown error'}`);
        }

        // status is Preparing, Queueing, or Processing - keep waiting
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Hailuo generation timed out');
}

// ============================================================================
// VIDEO GENERATION
// ============================================================================

/**
 * Generate video using Hailuo AI
 * Automatically selects the correct endpoint based on inputs:
 * - Text only -> T2V
 * - First frame only -> I2V  
 * - First + Last frame -> FL2V
 * 
 * @param prompt - Text description
 * @param imageBase64 - First frame image (base64 or URL)
 * @param lastFrameBase64 - Last frame image (base64 or URL)
 * @param modelId - Model ID (hailuo-2.3, hailuo-02, etc.)
 * @param resolution - Video resolution
 * @param apiKey - MiniMax API key
 * @param baseUrl - Optional custom API base URL (for proxies)
 */
export async function generateHailuoVideo({
    prompt,
    imageBase64,
    lastFrameBase64,
    modelId,
    aspectRatio,
    resolution,
    duration,
    apiKey,
    baseUrl
}) {
    const base = baseUrl || DEFAULT_HAILUO_BASE_URL;
    
    if (!apiKey) {
        throw new Error('Hailuo API key not configured');
    }

    const hasFirstFrame = !!imageBase64;
    const hasLastFrame = !!lastFrameBase64;
    const modelName = mapHailuoModelName(modelId, hasFirstFrame, hasLastFrame);
    const mappedResolution = mapResolution(resolution);
    const mappedDuration = mapHailuoDuration(duration);

    // Map aspect ratio - default to 16:9
    const mappedAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    // Prepare request body - duration can be 6 or 10 seconds for Hailuo
    const body = {
        model: modelName,
        prompt: prompt || '',
        duration: mappedDuration,
        resolution: mappedResolution,
        aspect_ratio: mappedAspectRatio
    };

    // Add first frame image if provided
    if (hasFirstFrame) {
        // Convert base64 to data URL if needed
        if (imageBase64.startsWith('data:')) {
            body.first_frame_image = imageBase64;
        } else if (imageBase64.startsWith('http')) {
            body.first_frame_image = imageBase64;
        } else {
            body.first_frame_image = `data:image/jpeg;base64,${imageBase64}`;
        }
    }

    // Add last frame image if provided (FL2V mode)
    if (hasLastFrame) {
        if (lastFrameBase64.startsWith('data:')) {
            body.last_frame_image = lastFrameBase64;
        } else if (lastFrameBase64.startsWith('http')) {
            body.last_frame_image = lastFrameBase64;
        } else {
            body.last_frame_image = `data:image/jpeg;base64,${lastFrameBase64}`;
        }
    }

    const mode = hasLastFrame ? 'FL2V (First+Last Frame)' :
        hasFirstFrame ? 'I2V (Image-to-Video)' :
            'T2V (Text-to-Video)';

    console.log('=== Hailuo Video Generation ===');
    console.log('Model:', modelName);
    console.log('Mode:', mode);
    console.log('First frame imageBase64 received:', hasFirstFrame ? `Yes (${(imageBase64 || '').substring(0, 50)}...)` : 'No');
    console.log('Last frame imageBase64 received:', hasLastFrame ? 'Yes' : 'No');
    console.log('Prompt:', (prompt || '').substring(0, 100) + '...');
    console.log('Duration:', body.duration, 'Resolution:', mappedResolution, 'Aspect Ratio:', mappedAspectRatio);

    // Log exact request body (without image data)
    const bodyForLogging = { ...body };
    if (bodyForLogging.first_frame_image) {
        bodyForLogging.first_frame_image = `[BASE64 IMAGE - ${bodyForLogging.first_frame_image.length} chars]`;
    }
    if (bodyForLogging.last_frame_image) {
        bodyForLogging.last_frame_image = `[BASE64 IMAGE - ${bodyForLogging.last_frame_image.length} chars]`;
    }
    console.log('Hailuo request body:', JSON.stringify(bodyForLogging, null, 2));

    // Create task
    const response = await fetch(`${base}/video_generation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();

    // Log full response for debugging
    console.log('Hailuo task creation response:', JSON.stringify(result, null, 2));

    // Check for API error
    if (result.base_resp && result.base_resp.status_code !== 0) {
        throw new Error(`Hailuo API error: ${result.base_resp.status_msg || 'Failed to create task'}`);
    }

    const taskId = result.task_id;
    if (!taskId) {
        throw new Error('No task ID returned from Hailuo API');
    }

    console.log(`Hailuo task created: ${taskId}`);

    // Poll for completion
    return await pollHailuoVideoTask(taskId, apiKey, base);
}

/**
 * Generate video with subject reference using Hailuo AI S2V
 * Uses a reference character image to maintain consistency
 * 
 * @param prompt - Text description
 * @param subjectImageBase64 - Subject reference image
 * @param apiKey - MiniMax API key
 * @param baseUrl - Optional custom API base URL (for proxies)
 */
export async function generateHailuoSubjectVideo({
    prompt,
    subjectImageBase64,
    apiKey,
    baseUrl
}) {
    const base = baseUrl || DEFAULT_HAILUO_BASE_URL;
    
    if (!apiKey) {
        throw new Error('Hailuo API key not configured');
    }

    if (!subjectImageBase64) {
        throw new Error('Subject reference image required for S2V mode');
    }

    // Format subject image
    let subjectImage = subjectImageBase64;
    if (!subjectImage.startsWith('data:') && !subjectImage.startsWith('http')) {
        subjectImage = `data:image/jpeg;base64,${subjectImage}`;
    }

    const body = {
        model: 'S2V-01',
        prompt: prompt || '',
        subject_reference: [
            {
                type: 'character',
                image: [subjectImage]
            }
        ]
    };

    console.log(`Hailuo S2V Gen: Subject reference video`);

    const response = await fetch(`${base}/video_generation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();

    if (result.base_resp && result.base_resp.status_code !== 0) {
        throw new Error(`Hailuo API error: ${result.base_resp.status_msg || 'Failed to create S2V task'}`);
    }

    const taskId = result.task_id;
    if (!taskId) {
        throw new Error('No task ID returned from Hailuo API');
    }

    console.log(`Hailuo S2V task created: ${taskId}`);

    return await pollHailuoVideoTask(taskId, apiKey, base);
}
