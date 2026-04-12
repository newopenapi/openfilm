/**
 * nanobanana.js
 * 
 * NanoBanana API service - Google Gemini image generation via https://open.bsv.vip proxy.
 * Uses Chat Completions API format to generate images.
 * 
 * Supported models:
 * - gemini-2.5-flash-image (无需额外参数)
 * - gemini-3-pro-image-preview (需 image_size 参数)
 * - gemini-3.1-flash-image-preview (无需额外参数)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_BASE_URL = 'https://open.bsv.vip';
const CHAT_COMPLETIONS_ENDPOINT = '/v1/chat/completions';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract base64 image data from response content
 */
function extractBase64Image(content) {
    if (!content) return null;
    
    // Match data URI format: data:image/png;base64,xxxxx
    const match = content.match(/data:(image\/[\w+]+);base64,([A-Za-z0-9+/=\s]+)/);
    if (match) {
        const mimeType = match[1].split('/')[1].split('+')[0].toLowerCase();
        const base64 = match[2].replace(/\s/g, '');
        return { mimeType, base64 };
    }
    return null;
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate image using NanoBanana API (Gemini models via Chat Completions)
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.prompt - Text prompt for image generation
 * @param {string} [params.imageBase64Array] - Array of base64 images for I2I
 * @param {string} [params.modelId] - Model ID (gemini-2.5-flash-image, etc.)
 * @param {string} [params.aspectRatio] - Aspect ratio (for display only)
 * @param {string} params.apiKey - NanoBanana API key
 * @param {string} [params.baseUrl] - Custom API base URL
 * @returns {Promise<string>} Base64 encoded image data URL
 */
export async function generateNanoBananaImage({
    prompt,
    imageBase64Array,
    modelId,
    aspectRatio,
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    if (!apiKey) {
        throw new Error('NanoBanana API key not configured');
    }

    // Model configuration with parameters
    const modelConfig = {
        'gemini-2.5-flash-image': { image_size: null },           // 无需额外参数
        'gemini-3-pro-image-preview': { image_size: '1024' },     // 需 image_size
        'gemini-3.1-flash-image-preview': { image_size: null }    // 无需额外参数
    };
    
    const modelName = modelId || 'gemini-2.5-flash-image';
    const config = modelConfig[modelName] || { image_size: null };

    // Build request body (Chat Completions format)
    const body = {
        model: modelName,
        stream: false,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt || '' }
                ]
            }
        ]
    };

    // Add image_size parameter if required
    if (config.image_size) {
        body.image_size = config.image_size;
    }

    // Add input images if provided
    if (imageBase64Array && imageBase64Array.length > 0) {
        // Add reference image
        const imageData = imageBase64Array[0].startsWith('data:')
            ? imageBase64Array[0]
            : `data:image/png;base64,${imageBase64Array[0]}`;
        body.messages[0].content.push({
            type: 'image_url',
            image_url: { url: imageData }
        });
    }

    console.log('=== NanoBanana Image Generation ===');
    console.log('Model:', modelName);
    console.log('Base URL:', baseUrl);
    console.log('Has image_size param:', !!config.image_size);
    console.log('Has input images:', !!imageBase64Array?.length);
    console.log('Prompt:', (prompt || '').substring(0, 100) + '...');
    
    const maskedKey = apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT SET';
    console.log('[NanoBanana] Using API Key:', maskedKey);

    // Make API request
    const requestUrl = `${baseUrl}${CHAT_COMPLETIONS_ENDPOINT}`;
    console.log('[NanoBanana] Request URL:', requestUrl);
    
    const startTime = Date.now();
    
    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const elapsed = Date.now() - startTime;
    console.log('[NanoBanana] Response status:', response.status, `(${elapsed}ms)`);

    // Parse response
    let result;
    try {
        result = await response.json();
    } catch (e) {
        const text = await response.text();
        throw new Error(`NanoBanana API invalid JSON response: ${text.substring(0, 200)}`);
    }

    // Log full response for debugging
    console.log('[NanoBanana] API response:', JSON.stringify(result, null, 2));

    // Handle error response
    if (result.error) {
        let errorMsg = result.error;
        if (typeof errorMsg === 'object') {
            errorMsg = errorMsg.message || JSON.stringify(errorMsg);
        }
        throw new Error(`NanoBanana API error: ${errorMsg}`);
    }

    if (!response.ok) {
        throw new Error(`NanoBanana API HTTP error ${response.status}: ${JSON.stringify(result)}`);
    }

    // Extract image from Chat Completions response
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('No content in NanoBanana response');
    }

    const imageData = extractBase64Image(content);
    if (!imageData) {
        throw new Error('No base64 image in NanoBanana response content');
    }

    console.log('[NanoBanana] Image extracted:', imageData.mimeType, `(${imageData.base64.length} chars)`);
    return `data:image/${imageData.mimeType};base64,${imageData.base64}`;
}
