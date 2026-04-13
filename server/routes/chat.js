/**
 * chat.js
 * 
 * 豆包 2.0 聊天大模型 API 路由
 * 支持 Doubao Pro/Lite/Seed 系列模型
 */

import express from 'express';
import { chatDoubao, generateDoubaoChat } from '../services/doubao.js';

const router = express.Router();

/**
 * POST /api/chat/completion
 * 聊天补全 API
 */
router.post('/completion', async (req, res) => {
    try {
        const { 
            messages, 
            model, 
            temperature, 
            maxTokens, 
            stream,
            systemPrompt 
        } = req.body;
        
        const { DOUBAN_API_KEY, DOUBAN_BASE_URL } = req.app.locals;

        // 使用豆包 API Key（优先）或火山引擎 API Key
        const apiKey = DOUBAN_API_KEY || req.app.locals.VOLCANO_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "豆包 API key not configured. 请在管理后台配置 DOUBAN_API_KEY 或使用 VOLCANO_API_KEY"
            });
        }

        console.log(`[Chat] Using Doubao model: ${model || 'doubao-2.0-pro'}`);

        // 如果没有传递 messages 但有 prompt，使用简单的 prompt 格式
        if (!messages && req.body.prompt) {
            const result = await chatDoubao({
                prompt: req.body.prompt,
                systemPrompt: systemPrompt,
                modelId: model || 'doubao-2.0-pro',
                temperature: temperature || 0.7,
                maxTokens: maxTokens || 4096,
                apiKey,
                baseUrl: DOUBAN_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
            });

            return res.json({
                success: true,
                data: {
                    content: result,
                    model: model || 'doubao-2.0-pro'
                }
            });
        }

        // 使用 messages 数组格式
        const result = await generateDoubaoChat({
            messages: messages || [],
            modelId: model || 'doubao-2.0-pro',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 4096,
            stream: stream || false,
            apiKey,
            baseUrl: DOUBAN_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
        });

        // Extract content from result
        const content = result.choices?.[0]?.message?.content || '';

        res.json({
            success: true,
            data: {
                content,
                model: model || 'doubao-2.0-pro',
                usage: result.usage,
                id: result.id
            }
        });

    } catch (error) {
        console.error('[Chat] Doubao API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || '聊天生成失败'
        });
    }
});

/**
 * POST /api/chat/completion/stream
 * 流式聊天补全 API
 */
router.post('/completion/stream', async (req, res) => {
    try {
        const { 
            messages, 
            model, 
            temperature, 
            maxTokens,
            systemPrompt 
        } = req.body;
        
        const { DOUBAN_API_KEY, DOUBAN_BASE_URL } = req.app.locals;

        const apiKey = DOUBAN_API_KEY || req.app.locals.VOLCANO_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "API key not configured"
            });
        }

        // 如果没有传递 messages 但有 prompt
        const chatMessages = messages || [];
        if (req.body.prompt) {
            if (systemPrompt) {
                chatMessages.unshift({ role: 'system', content: systemPrompt });
            }
            chatMessages.push({ role: 'user', content: req.body.prompt });
        }

        // 设置 SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const stream = await generateDoubaoChat({
            messages: chatMessages,
            modelId: model || 'doubao-2.0-pro',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 4096,
            stream: true,
            apiKey,
            baseUrl: DOUBAN_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
        });

        // Pipe the stream to response
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('[Chat] Stream error:', error);
            res.end();
        });

    } catch (error) {
        console.error('[Chat] Stream API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || '流式聊天生成失败'
        });
    }
});

/**
 * GET /api/chat/models
 * 获取支持的聊天模型列表
 */
router.get('/models', (req, res) => {
    const models = [
        // Doubao 2.0 Pro 系列
        { id: 'doubao-2.0-pro', name: '豆包 2.0 Pro', description: '32K上下文，高性能', provider: 'doubao' },
        { id: 'doubao-2.0-pro-128k', name: '豆包 2.0 Pro 128K', description: '128K超长上下文', provider: 'doubao' },
        { id: 'doubao-2.0-pro-256k', name: '豆包 2.0 Pro 256K', description: '256K超长上下文', provider: 'doubao' },
        // Doubao 2.0 Lite 系列
        { id: 'doubao-2.0-lite', name: '豆包 2.0 Lite', description: '高性价比', provider: 'doubao' },
        { id: 'doubao-2.0-lite-128k', name: '豆包 2.0 Lite 128K', description: '128K上下文，高性价比', provider: 'doubao' },
        // Doubao Seed 系列
        { id: 'doubao-seed-2.0-code', name: '豆包 Seed 2.0 Code', description: '编程辅助模型', provider: 'doubao' },
        // Legacy
        { id: 'doubao-pro', name: '豆包 Pro (兼容)', description: '旧版兼容', provider: 'doubao' },
        { id: 'doubao-lite', name: '豆包 Lite (兼容)', description: '旧版兼容', provider: 'doubao' },
    ];

    res.json({
        success: true,
        data: { models }
    });
});

export default router;
