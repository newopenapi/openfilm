/**
 * generation.js
 * 
 * Routes for AI image and video generation.
 * Supports Gemini, Veo, Kling AI, Hailuo AI, and OpenAI GPT Image providers.
 * Includes credit deduction for billing.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { generateKlingVideo, generateKlingImage, generateKlingMultiImage } from '../services/kling.js';
import { generateGeminiImage, generateVeoVideo } from '../services/gemini.js';
import { generateHailuoVideo } from '../services/hailuo.js';
import { generateOpenAIImage } from '../services/openai.js';
import { generateVolcanoVideo } from '../services/volcano.js';
import { generateNanoBananaImage } from '../services/nanobanana.js';
import { generateDoubaoImage } from '../services/doubao.js';
import { resolveImageToBase64, saveBufferToFile } from '../utils/imageHelpers.js';
import { User, CreditTransaction, AIModel } from '../models/index.cjs';
import { getRequiredCreditsForModel } from '../services/billing.js';
import { authenticateToken } from '../middleware/auth.cjs';

const router = express.Router();

// ============================================================================
// IMAGE GENERATION
// ============================================================================

router.post('/generate-image', authenticateToken, async (req, res) => {
    try {
        const { nodeId, prompt, aspectRatio, resolution, imageBase64: rawImageBase64, imageModel, klingReferenceMode, klingFaceIntensity, klingSubjectIntensity } = req.body;
        const { GEMINI_API_KEY, KLING_ACCESS_KEY, KLING_SECRET_KEY, KLING_BASE_URL, OPENAI_API_KEY, OPENAI_BASE_URL, NANOBANANA_API_KEY, NANOBANANA_BASE_URL, VOLCANO_API_KEY, VOLCANO_BASE_URL, IMAGES_DIR } = req.app.locals;

        // === BILLING CHECK & DEDUCT ===
        // Get user from token
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Get required credits for this model
        let requiredCredits = 1;
        try {
            requiredCredits = await getRequiredCreditsForModel(imageModel);
        } catch (err) {
            // If model not found in database, default to 1 credit
            console.log(`[Billing] Model ${imageModel} not found in AIModel table, using default 1 credit`);
            requiredCredits = 1;
        }

        // Check balance
        if (user.balance < requiredCredits) {
            return res.status(402).json({ 
                error: `Insufficient balance. Required: ${requiredCredits} credits, your balance: ${user.balance}`,
                required: requiredCredits,
                balance: user.balance
            });
        }

        // Determine provider
        const isKlingModel = imageModel && imageModel.startsWith('kling-');
        const isOpenAIModel = imageModel && imageModel.startsWith('gpt-image-');
        const isNanoBananaModel = imageModel && (imageModel.startsWith('gemini-2.5-flash-image') || imageModel.startsWith('gemini-3-pro-image') || imageModel.startsWith('gemini-3.1-flash-image'));
        // 豆包 Seedream 图片模型
        const isDoubaoSeedreamModel = imageModel && (imageModel.startsWith('seedream-'));

        let imageBuffer;
        let imageFormat = 'png';

        if (process.env.MOCK_GENERATION === '1') {
            const { default: sharp } = await import('sharp');
            imageBuffer = await sharp({
                create: {
                    width: 1024,
                    height: 1024,
                    channels: 4,
                    background: { r: 20, g: 20, b: 30, alpha: 1 }
                }
            })
                .png()
                .toBuffer();
        } else if (isKlingModel) {
            // --- KLING AI IMAGE GENERATION ---
            if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
                return res.status(500).json({
                    error: "Kling API credentials not configured. Add KLING_ACCESS_KEY and KLING_SECRET_KEY to .env"
                });
            }

            console.log(`Using Kling AI model for image: ${imageModel}`);

            // Resolve images if provided
            let resolvedImages = null;
            if (rawImageBase64) {
                const rawImages = Array.isArray(rawImageBase64) ? rawImageBase64 : [rawImageBase64];
                resolvedImages = rawImages.map(img => resolveImageToBase64(img)).filter(Boolean);
            }

            let klingImageUrl;

            // Determine which API to use based on model and reference images:
            // - kling-v1-5: Uses standard API with image_reference parameter
            // - kling-v2, kling-v2-1: Use Multi-Image API (image_reference not supported)
            const isV2Model = imageModel === 'kling-v2' || imageModel === 'kling-v2-1' || imageModel === 'kling-v2-new';
            const hasReferenceImages = resolvedImages && resolvedImages.length > 0;

            if (hasReferenceImages && isV2Model) {
                // V2 models: Use Multi-Image API for image-to-image
                console.log(`Using Kling Multi-Image API for ${imageModel} with ${resolvedImages.length} subject image(s)`);
                klingImageUrl = await generateKlingMultiImage({
                    prompt,
                    subjectImages: resolvedImages,
                    modelId: imageModel,
                    aspectRatio,
                    resolution,
                    accessKey: KLING_ACCESS_KEY,
                    secretKey: KLING_SECRET_KEY
                });
            } else if (hasReferenceImages && resolvedImages.length > 1) {
                // Multiple images with non-V2 model: Use Multi-Image API
                console.log(`Using Kling Multi-Image API with ${resolvedImages.length} subject images`);
                klingImageUrl = await generateKlingMultiImage({
                    prompt,
                    subjectImages: resolvedImages,
                    modelId: imageModel,
                    aspectRatio,
                    resolution,
                    accessKey: KLING_ACCESS_KEY,
                    secretKey: KLING_SECRET_KEY
                });
            } else {
                // V1.5 or text-to-image: Use standard API (V1.5 supports image_reference)
                klingImageUrl = await generateKlingImage({
                    prompt,
                    imageBase64: resolvedImages,
                    modelId: imageModel,
                    aspectRatio,
                    resolution,
                    klingReferenceMode,
                    klingFaceIntensity,
                    klingSubjectIntensity,
                    accessKey: KLING_ACCESS_KEY,
                    secretKey: KLING_SECRET_KEY
                });
            }

            // Download from Kling's URL
            const imageResponse = await fetch(klingImageUrl);
            if (!imageResponse.ok) {
                throw new Error('Failed to download image from Kling');
            }
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            if (klingImageUrl.includes('.jpg') || klingImageUrl.includes('.jpeg')) {
                imageFormat = 'jpg';
            }

        } else if (isOpenAIModel) {
            // --- OPENAI GPT IMAGE GENERATION ---
            if (!OPENAI_API_KEY) {
                return res.status(500).json({
                    error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env"
                });
            }

            console.log(`Using OpenAI GPT Image model: ${imageModel}`);

            // Resolve images if provided
            let imageBase64Array = null;
            if (rawImageBase64) {
                const rawImages = Array.isArray(rawImageBase64) ? rawImageBase64 : [rawImageBase64];
                imageBase64Array = rawImages.map(img => resolveImageToBase64(img)).filter(Boolean);
            }

            imageBuffer = await generateOpenAIImage({
                prompt,
                imageBase64Array,
                aspectRatio,
                resolution,
                apiKey: OPENAI_API_KEY,
                baseUrl: OPENAI_BASE_URL
            });

        } else if (isNanoBananaModel) {
            // --- NANOBANANA (GEMINI) IMAGE GENERATION ---
            if (!NANOBANANA_API_KEY) {
                return res.status(500).json({
                    error: "NanoBanana API key not configured. Add NANOBANANA_API_KEY to .env"
                });
            }

            console.log(`Using NanoBanana (Gemini) model: ${imageModel}`);

            // Resolve images if provided
            let imageBase64ArrayNb = null;
            if (rawImageBase64) {
                const rawImages = Array.isArray(rawImageBase64) ? rawImageBase64 : [rawImageBase64];
                imageBase64ArrayNb = rawImages.map(img => resolveImageToBase64(img)).filter(Boolean);
            }

            const nanobananaResult = await generateNanoBananaImage({
                prompt,
                imageBase64Array: imageBase64ArrayNb,
                modelId: imageModel,
                aspectRatio,
                resolution,
                apiKey: NANOBANANA_API_KEY,
                baseUrl: NANOBANANA_BASE_URL
            });

            // nanobanana returns data URL, convert to buffer
            if (nanobananaResult.startsWith('data:')) {
                const base64Match = nanobananaResult.match(/^data:image\/\w+;base64,(.+)$/);
                imageBuffer = Buffer.from(base64Match[1], 'base64');
                if (nanobananaResult.includes('image/jpeg')) {
                    imageFormat = 'jpg';
                }
            } else {
                imageBuffer = Buffer.from(nanobananaResult, 'base64');
            }

        } else if (isDoubaoSeedreamModel) {
            // --- DOUBAN (SEEDREAM) IMAGE GENERATION ---
            // 豆包 Seedream 模型使用火山引擎 API Key
            if (!VOLCANO_API_KEY) {
                return res.status(500).json({
                    error: "火山引擎 API key not configured. Add VOLCANO_API_KEY to .env"
                });
            }

            console.log(`Using Doubao Seedream model: ${imageModel}`);

            // Resolve reference image if provided
            const refImageBase64 = rawImageBase64 ? resolveImageToBase64(rawImageBase64) : null;

            // Generate image using Doubao Seedream API
            const seedreamUrls = await generateDoubaoImage({
                prompt,
                refImageBase64,
                modelId: imageModel,
                aspectRatio,
                apiKey: VOLCANO_API_KEY,
                baseUrl: VOLCANO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
                watermark: false
            });

            // Get first image URL
            const imageUrl = Array.isArray(seedreamUrls) ? seedreamUrls[0] : seedreamUrls;

            // Download the generated image
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error('Failed to download image from Doubao Seedream');
            }
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
                imageFormat = 'jpg';
            }

        } else {
            // --- GEMINI IMAGE GENERATION (Default) ---
            if (!GEMINI_API_KEY) {
                return res.status(500).json({ error: "Server missing API Key config" });
            }

            let imageBase64Array = null;
            if (rawImageBase64) {
                const rawImages = Array.isArray(rawImageBase64) ? rawImageBase64 : [rawImageBase64];
                imageBase64Array = rawImages.map(img => resolveImageToBase64(img)).filter(Boolean);
            }

            imageBuffer = await generateGeminiImage({
                prompt,
                imageBase64Array,
                aspectRatio,
                resolution,
                apiKey: GEMINI_API_KEY
            });
        }

        // Save to library - use unique filename to preserve previous generations
        const saved = saveBufferToFile(imageBuffer, IMAGES_DIR, 'img', imageFormat);

        // Determine metadata ID: use nodeId for recovery if available, otherwise use file ID
        const metadataId = nodeId || saved.id;

        // Save metadata (id must match the metadata filename for delete to work)
        const metadata = {
            id: metadataId,  // Must match the filename for delete API to find it
            filename: saved.filename,
            prompt: prompt,
            model: imageModel || 'gemini-pro',
            createdAt: new Date().toISOString(),
            type: 'images'
        };
        fs.writeFileSync(path.join(IMAGES_DIR, `${metadataId}.json`), JSON.stringify(metadata, null, 2));

        console.log(`Image saved: ${saved.url} (model: ${imageModel || 'gemini-pro'})`);

        await User.sequelize.transaction(async (t) => {
            const lockedUser = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!lockedUser) {
                throw new Error('User not found');
            }
            const balanceBefore = lockedUser.balance;
            if (balanceBefore < requiredCredits) {
                const err = new Error(`Insufficient balance. Required: ${requiredCredits} credits, your balance: ${balanceBefore}`);
                err.statusCode = 402;
                throw err;
            }
            const balanceAfter = balanceBefore - requiredCredits;
            await lockedUser.update({ balance: balanceAfter }, { transaction: t });
            await CreditTransaction.create({
                user_id: userId,
                type: 'generation',
                credits: -requiredCredits,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference_id: metadataId,
                description: `Image generation - ${imageModel || 'gemini'}`
            }, { transaction: t });
        });

        console.log(`[Billing] Deducted ${requiredCredits} credits from user ${userId} for image generation (${imageModel})`);

        return res.json({ resultUrl: saved.url });

    } catch (error) {
        console.error("Server Image Gen Error:", error);
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || "Image generation failed" });
    }
});

// ============================================================================
// VIDEO GENERATION
// ============================================================================

router.post('/generate-video', authenticateToken, async (req, res) => {
    try {
        const { nodeId, prompt, imageBase64: rawImageBase64, lastFrameBase64: rawLastFrameBase64, styleReferenceBase64: rawStyleReferenceBase64, referenceImageBase64: rawReferenceImageBase64, endFrameImageBase64: rawEndFrameImageBase64, motionReferenceUrl: rawMotionReferenceUrl, aspectRatio, resolution, duration, videoModel, seed, cameraFixed, generateAudio, watermark, returnLastFrame } = req.body;
        const { GEMINI_API_KEY, KLING_ACCESS_KEY, KLING_SECRET_KEY, KLING_BASE_URL, HAILUO_API_KEY, HAILUO_BASE_URL, FAL_API_KEY, FAL_BASE_URL, VOLCANO_API_KEY, VOLCANO_BASE_URL, VIDEOS_DIR } = req.app.locals;

        // === BILLING CHECK & DEDUCT ===
        // Get user from token
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Get required credits for this model
        let requiredCredits = 3;
        try {
            requiredCredits = await getRequiredCreditsForModel(videoModel);
        } catch (err) {
            // If model not found in database, use default 3 credits for video
            console.log(`[Billing] Model ${videoModel} not found in AIModel table, using default 3 credits`);
            requiredCredits = 3;
        }

        // Check balance
        if (user.balance < requiredCredits) {
            return res.status(402).json({ 
                error: `Insufficient balance. Required: ${requiredCredits} credits, your balance: ${user.balance}`,
                required: requiredCredits,
                balance: user.balance
            });
        }

        // Resolve file URLs to base64

        // Resolve file URLs to base64
        const imageBase64 = resolveImageToBase64(rawImageBase64);
        const lastFrameBase64 = resolveImageToBase64(rawLastFrameBase64);
        const styleReferenceBase64 = resolveImageToBase64(rawStyleReferenceBase64);
        const motionReferenceUrl = resolveImageToBase64(rawMotionReferenceUrl);
        // Seedance 2.0 first frame and end frame
        const referenceImageBase64 = resolveImageToBase64(rawReferenceImageBase64);
        const endFrameImageBase64 = resolveImageToBase64(rawEndFrameImageBase64);

        // Determine provider
        const isKlingModel = videoModel && videoModel.startsWith('kling-');
        const isHailuoModel = videoModel && videoModel.startsWith('hailuo-');
        const isVolcanoModel = videoModel && videoModel.startsWith('seedance-');

        let videoBuffer;

        if (process.env.MOCK_GENERATION === '1') {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openfilm-mock-'));
            const outPath = path.join(tmpDir, 'mock.mp4');
            const ff = spawnSync('ffmpeg', [
                '-y',
                '-f', 'lavfi',
                '-i', 'color=c=black:s=1280x720:r=30:d=1',
                '-f', 'lavfi',
                '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-shortest',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                outPath
            ], { stdio: 'ignore' });
            if (ff.status !== 0 || !fs.existsSync(outPath)) {
                throw new Error('Mock video generation failed');
            }
            videoBuffer = fs.readFileSync(outPath);
        } else if (isVolcanoModel) {
            // --- VOLCANO ENGINE (SEEDANCE) VIDEO GENERATION ---
            if (!VOLCANO_API_KEY) {
                return res.status(500).json({
                    error: "Volcano API key not configured. Add VOLCANO_API_KEY to .env"
                });
            }

            console.log(`Using Volcano/Seedance model: ${videoModel}, duration: ${duration || 5}s`);

            // Use explicit reference/end frame if provided, otherwise fall back to imageBase64/lastFrameBase64
            const firstFrameBase64 = referenceImageBase64 || imageBase64;
            const endFrameBase64 = endFrameImageBase64 || lastFrameBase64;

            const volcanoVideoUrl = await generateVolcanoVideo({
                prompt,
                imageBase64: firstFrameBase64,
                lastFrameBase64: endFrameBase64,
                styleReferenceBase64,
                modelId: videoModel,
                aspectRatio,
                resolution,
                duration: duration || 5,
                seed,
                cameraFixed,
                generateAudio,
                watermark,
                returnLastFrame,
                apiKey: VOLCANO_API_KEY,
                baseUrl: VOLCANO_BASE_URL
            });

            // Download from Volcano's URL
            const videoResponse = await fetch(volcanoVideoUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to download video from Volcano');
            }
            videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        } else if (isKlingModel) {
            // --- KLING AI VIDEO GENERATION ---

            // Check if this is a Kling 2.6 model (route to Fal.ai - official API doesn't support v2.6)
            const isKling26 = videoModel === 'kling-v2-6';
            // Check if this is a motion control request (kling-v2-6 with motion reference)
            const isMotionControl = isKling26 && motionReferenceUrl;

            let resultVideoUrl;

            if (isKling26) {
                // --- KLING 2.6 VIA FAL.AI ---
                // Official Kling API doesn't support v2.6, use fal.ai instead

                if (!FAL_API_KEY) {
                    return res.status(500).json({
                        error: "FAL_API_KEY not configured. Add FAL_API_KEY to .env for Kling 2.6."
                    });
                }

                if (isMotionControl) {
                    // Motion Control mode
                    console.log(`\n[Route] Kling 2.6 Motion Control detected - routing to fal.ai`);
                    console.log(`[Route] Motion Reference: ${motionReferenceUrl ? 'YES (' + Math.round(motionReferenceUrl.length / 1024) + ' KB)' : 'NO'}`);
                    console.log(`[Route] Character Image: ${imageBase64 ? 'YES (' + Math.round(imageBase64.length / 1024) + ' KB)' : 'NO'}`);
                    console.log(`[Route] Prompt: ${prompt ? prompt.substring(0, 50) + '...' : '(none)'}`);

                    const { generateFalMotionControl } = await import('../services/fal.js');

                    resultVideoUrl = await generateFalMotionControl({
                        prompt,
                        characterImageBase64: imageBase64,
                        motionVideoBase64: motionReferenceUrl,
                        characterOrientation: 'video',
                        apiKey: FAL_API_KEY,
                        baseUrl: FAL_BASE_URL
                    });
                } else {
                    // Standard Image-to-Video mode
                    console.log(`\n[Route] Kling 2.6 Image-to-Video - routing to fal.ai`);
                    console.log(`[Route] Image: ${imageBase64 ? 'YES (' + Math.round(imageBase64.length / 1024) + ' KB)' : 'NO'}`);
                    console.log(`[Route] Duration: ${duration || 5}s`);
                    console.log(`[Route] Generate Audio: ${req.body.generateAudio !== false}`);

                    const { generateFalImageToVideo } = await import('../services/fal.js');

                    resultVideoUrl = await generateFalImageToVideo({
                        prompt,
                        imageBase64,
                        duration: String(duration || 5),
                        generateAudio: req.body.generateAudio !== false, // Default to true
                        apiKey: FAL_API_KEY,
                        baseUrl: FAL_BASE_URL
                    });
                }
            } else {
                // --- STANDARD KLING VIDEO GENERATION ---
                if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
                    return res.status(500).json({
                        error: "Kling API credentials not configured. Add KLING_ACCESS_KEY and KLING_SECRET_KEY to .env"
                    });
                }

                console.log(`Using Kling AI model: ${videoModel}, duration: ${duration || 5}s`);

                resultVideoUrl = await generateKlingVideo({
                    prompt,
                    imageBase64,
                    lastFrameBase64,
                    modelId: videoModel,
                    aspectRatio,
                    duration: duration || 5,
                    motionReferenceUrl,
                    accessKey: KLING_ACCESS_KEY,
                    secretKey: KLING_SECRET_KEY,
                    baseUrl: KLING_BASE_URL
                });
            }

            // Download from the result URL
            const videoResponse = await fetch(resultVideoUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to download generated video');
            }
            videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        } else if (isHailuoModel) {
            // --- HAILUO AI VIDEO GENERATION ---
            if (!HAILUO_API_KEY) {
                return res.status(500).json({
                    error: "Hailuo API key not configured. Add HAILUO_API_KEY to .env"
                });
            }

            console.log(`Using Hailuo AI model: ${videoModel}, duration: ${duration || 6}s`);

            const hailuoVideoUrl = await generateHailuoVideo({
                prompt,
                imageBase64,
                lastFrameBase64,
                modelId: videoModel,
                aspectRatio,
                resolution,
                duration: duration || 6,
                apiKey: HAILUO_API_KEY,
                baseUrl: HAILUO_BASE_URL
            });

            // Download from Hailuo's URL
            const videoResponse = await fetch(hailuoVideoUrl);
            if (!videoResponse.ok) {
                throw new Error('Failed to download video from Hailuo');
            }
            videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        } else {
            // --- VEO VIDEO GENERATION (Default) ---
            if (!GEMINI_API_KEY) {
                return res.status(500).json({ error: "Server missing API Key config" });
            }

            console.log(`Using Veo model: ${videoModel || 'veo-3.1'}, duration: ${duration || 8}s, generateAudio: ${req.body.generateAudio !== false}`);

            videoBuffer = await generateVeoVideo({
                prompt,
                imageBase64,
                lastFrameBase64,
                aspectRatio,
                resolution,
                duration: duration || 8,
                generateAudio: req.body.generateAudio !== false, // Default to true
                apiKey: GEMINI_API_KEY
            });
        }

        // Save to library - use unique filename to preserve previous generations
        const saved = saveBufferToFile(videoBuffer, VIDEOS_DIR, 'vid', 'mp4');

        // Determine metadata ID: use nodeId for recovery if available, otherwise use file ID
        const metadataId = nodeId || saved.id;

        // Save metadata (id must match the metadata filename for delete to work)
        const metadata = {
            id: metadataId,  // Must match the filename for delete API to find it
            filename: saved.filename,
            prompt: prompt,
            model: videoModel || 'veo-3.1',
            aspectRatio: aspectRatio || 'Auto',
            resolution: resolution || 'Auto',
            createdAt: new Date().toISOString(),
            type: 'videos'
        };
        fs.writeFileSync(path.join(VIDEOS_DIR, `${metadataId}.json`), JSON.stringify(metadata, null, 2));

        console.log(`Video saved: ${saved.url} (model: ${videoModel || 'veo-3.1'})`);

        await User.sequelize.transaction(async (t) => {
            const lockedUser = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!lockedUser) {
                throw new Error('User not found');
            }
            const balanceBefore = lockedUser.balance;
            if (balanceBefore < requiredCredits) {
                const err = new Error(`Insufficient balance. Required: ${requiredCredits} credits, your balance: ${balanceBefore}`);
                err.statusCode = 402;
                throw err;
            }
            const balanceAfter = balanceBefore - requiredCredits;
            await lockedUser.update({ balance: balanceAfter }, { transaction: t });
            await CreditTransaction.create({
                user_id: userId,
                type: 'generation',
                credits: -requiredCredits,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reference_id: metadataId,
                description: `Video generation - ${videoModel || 'veo'}`
            }, { transaction: t });
        });

        console.log(`[Billing] Deducted ${requiredCredits} credits from user ${userId} for video generation (${videoModel})`);
        return res.json({ resultUrl: saved.url });

    } catch (error) {
        console.error("Server Video Gen Error:", error);
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || "Video generation failed" });
    }
});

// ============================================================================
// GENERATION STATUS / RECOVERY
// ============================================================================

/**
 * Check if a generation has finished for a specific nodeId.
 * Returns the resultUrl if it exists.
 */
router.get('/generation-status/:nodeId', async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { IMAGES_DIR, VIDEOS_DIR } = req.app.locals;

        // Check images metadata
        const imageMetaPath = path.join(IMAGES_DIR, `${nodeId}.json`);
        if (fs.existsSync(imageMetaPath)) {
            const meta = JSON.parse(fs.readFileSync(imageMetaPath, 'utf8'));
            return res.json({ status: 'success', resultUrl: `/library/images/${meta.filename}`, type: 'image', createdAt: meta.createdAt });
        }

        // Check videos metadata
        const videoMetaPath = path.join(VIDEOS_DIR, `${nodeId}.json`);
        if (fs.existsSync(videoMetaPath)) {
            const meta = JSON.parse(fs.readFileSync(videoMetaPath, 'utf8'));
            return res.json({ status: 'success', resultUrl: `/library/videos/${meta.filename}`, type: 'video', createdAt: meta.createdAt });
        }

        res.json({ status: 'pending' });
    } catch (error) {
        console.error("Status Check Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
