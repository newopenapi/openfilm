/**
 * doubao.js
 * 
 * 豆包 (Doubao) AI 服务 - 图片生成和聊天
 * 支持 Seedream 图片生成模型和 Doubao 2.0 聊天模型
 * 
 * API Format: OpenAI SDK 兼容格式
 */

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

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

// ============================================================================
// IMAGE GENERATION - Seedream Models
// ============================================================================

/**
 * Map frontend model ID to Doubao API model name for image generation
 */
function mapImageModelName(modelId) {
    const mapping = {
        'seedream-5.0': 'doubao-seedream-5-0-lite-260415',
        'seedream-4.6': 'doubao-seedream-4-6-250522',
        'seedream-4.5': 'doubao-seedream-4-5-251128',
        'seedream-4.0': 'doubao-seedream-4-0'
    };
    return mapping[modelId] || 'doubao-seedream-5-0-lite-260415';
}

/**
 * Map aspect ratio to Doubao API format
 */
function mapAspectRatio(ratio) {
    const mapping = {
        '1:1': '1:1',
        '16:9': '16:9',
        '9:16': '9:16',
        '4:3': '4:3',
        '3:4': '3:4',
        '2K': '2K',
        '1080p': '1080p',
        '4K': '4K'
    };
    return mapping[ratio] || '2K';
}

/**
 * Generate image using Doubao Seedream models
 */
export async function generateDoubaoImage({
    prompt,
    refImageBase64,
    modelId,
    aspectRatio,
    watermark = false,
    sequentialGeneration = 'disabled', // 'disabled' or 'auto'
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    if (!apiKey) {
        throw new Error('Doubao API key not configured');
    }

    if (!prompt) {
        throw new Error('Prompt is required for image generation');
    }

    const modelName = mapImageModelName(modelId);

    // Build request body
    const body = {
        model: modelName,
        prompt: prompt,
        size: mapAspectRatio(aspectRatio),
        response_format: 'url'
    };

    // Add reference images if provided
    if (refImageBase64) {
        const rawBase64 = extractRawBase64(refImageBase64) || refImageBase64;
        // Check if it's a URL or base64
        if (refImageBase64.startsWith('http://') || refImageBase64.startsWith('https://')) {
            body.ref_image_list = [{ url: refImageBase64 }];
        } else {
            // Base64 data
            const mimeType = refImageBase64.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
            body.ref_image_list = [{ url: `data:${mimeType};base64,${rawBase64}` }];
        }
    }

    // Add optional parameters
    if (watermark !== undefined) {
        body.watermark = watermark;
    }
    
    if (sequentialGeneration) {
        body.sequential_image_generation = sequentialGeneration;
    }

    console.log('=== Doubao Image Generation (Seedream) ===');
    console.log('Model:', modelName);
    console.log('Base URL:', baseUrl);
    console.log('Has reference:', !!refImageBase64);
    console.log('Sequential:', sequentialGeneration);
    console.log('Prompt:', prompt.substring(0, 100) + '...');

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
        throw new Error(`Doubao API empty response (status: ${response.status})`);
    }

    let result;
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Doubao API invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    console.log('[Doubao] Image generation response:', JSON.stringify(result, null, 2));

    if (result.error) {
        let errorMsg = result.error;
        if (typeof errorMsg === 'object') {
            errorMsg = errorMsg.message || errorMsg.code || JSON.stringify(errorMsg);
        }
        throw new Error(`Doubao API error: ${errorMsg}`);
    }

    if (!response.ok) {
        throw new Error(`Doubao API HTTP error ${response.status}: ${responseText}`);
    }

    // Parse response - Seedream returns images array
    const images = result.data || result.images || [];
    if (images.length === 0) {
        throw new Error('No images generated');
    }

    // Return all generated image URLs
    const imageUrls = images.map(img => img.url || img.b64_json);
    return imageUrls;
}

// ============================================================================
// CHAT COMPLETION - Doubao 2.0 Models
// ============================================================================

/**
 * Map frontend model ID to Doubao API model name for chat
 */
function mapChatModelName(modelId) {
    const mapping = {
        // Doubao 2.0 Pro series
        'doubao-2.0-pro': 'doubao-pro-32k',
        'doubao-2.0-pro-128k': 'doubao-pro-128k',
        'doubao-2.0-pro-256k': 'doubao-pro-256k',
        // Doubao 2.0 Lite series
        'doubao-2.0-lite': 'doubao-lite-32k',
        'doubao-2.0-lite-128k': 'doubao-lite-128k',
        // Doubao Seed series (reasoning models)
        'doubao-seed-2.0-pro': 'doubao-seed-2.0-pro',
        'doubao-seed-2.0-code': 'doubao-seed-2.0-code',
        // Legacy
        'doubao-pro': 'doubao-pro-32k',
        'doubao-lite': 'doubao-lite-32k'
    };
    return mapping[modelId] || modelId || 'doubao-pro-32k';
}

/**
 * Generate chat completion using Doubao models
 */
export async function generateDoubaoChat({
    messages,
    modelId,
    temperature = 0.7,
    maxTokens = 4096,
    stream = false,
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    if (!apiKey) {
        throw new Error('Doubao API key not configured');
    }

    if (!messages || messages.length === 0) {
        throw new Error('Messages are required for chat');
    }

    const modelName = mapChatModelName(modelId);

    const body = {
        model: modelName,
        messages: messages,
        stream: stream
    };

    // Add optional parameters
    if (temperature !== undefined) {
        body.temperature = temperature;
    }
    if (maxTokens !== undefined) {
        body.max_tokens = maxTokens;
    }

    console.log('=== Doubao Chat Completion ===');
    console.log('Model:', modelName);
    console.log('Base URL:', baseUrl);
    console.log('Stream:', stream);
    console.log('Message count:', messages.length);

    if (stream) {
        // Streaming response
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Doubao API HTTP error ${response.status}: ${errorText}`);
        }

        return response.body; // Return stream
    } else {
        // Non-streaming response
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
            throw new Error(`Doubao API empty response (status: ${response.status})`);
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Doubao API invalid JSON response: ${responseText.substring(0, 200)}`);
        }

        console.log('[Doubao] Chat response:', JSON.stringify(result, null, 2));

        if (result.error) {
            let errorMsg = result.error;
            if (typeof errorMsg === 'object') {
                errorMsg = errorMsg.message || errorMsg.code || JSON.stringify(errorMsg);
            }
            throw new Error(`Doubao API error: ${errorMsg}`);
        }

        if (!response.ok) {
            throw new Error(`Doubao API HTTP error ${response.status}: ${responseText}`);
        }

        return result;
    }
}

/**
 * Simple text-only chat completion
 */
export async function chatDoubao({
    prompt,
    systemPrompt = '',
    modelId,
    temperature = 0.7,
    maxTokens = 4096,
    apiKey,
    baseUrl = DEFAULT_BASE_URL
}) {
    // Build messages array
    const messages = [];
    
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const result = await generateDoubaoChat({
        messages,
        modelId,
        temperature,
        maxTokens,
        stream: false,
        apiKey,
        baseUrl
    });

    // Extract response content
    const choices = result.choices || [];
    if (choices.length === 0) {
        throw new Error('No response from Doubao');
    }

    return choices[0].message?.content || '';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    generateDoubaoImage,
    generateDoubaoChat,
    chatDoubao,
    mapImageModelName,
    mapChatModelName
};
