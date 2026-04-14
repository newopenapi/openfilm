/**
 * billing.js
 * 
 * Billing service for credit deduction based on AI model pricing
 * Get required credits for a model based on AIModel configuration
 */

import { ModelPricing } from '../models/index.cjs';

/**
 * Get required credits for a given model ID
 * @param {string} modelId - Model ID (e.g., 'gemini-2.5-flash-image', 'seedance-2.0')
 * @returns {Promise<number>} Credits required for this model
 */
export async function getRequiredCreditsForModel(modelId) {
    try {
        if (!modelId) {
            return 0;
        }

        const pricing = await ModelPricing.findOne({
            where: {
                model_id: modelId,
                billing_type: 'per_call',
                is_active: true
            }
        });

        if (pricing) {
            const priceNum = typeof pricing.price === 'string' ? parseFloat(pricing.price) : Number(pricing.price);
            const minChargeNum = typeof pricing.min_charge === 'string' ? parseInt(pricing.min_charge, 10) : Number(pricing.min_charge);
            const credits = Number.isFinite(priceNum) ? Math.ceil(priceNum) : 0;
            const minCharge = Number.isFinite(minChargeNum) ? minChargeNum : 1;
            return Math.max(credits, minCharge);
        }

        if (modelId.includes('seedance') || modelId.includes('hailuo') || modelId.includes('kling')) {
            return 10;
        }

        if (modelId.includes('seedream') || modelId.includes('image') || modelId.includes('gemini') || modelId.includes('dalle') || modelId.includes('gpt-image')) {
            return 1;
        }

        return 1;
    } catch (error) {
        console.error('[billing] Error getting model credits:', error);
        return 1;
    }
}

/**
 * Deduct credits from user after successful generation
 * @param {number} userId - User ID
 * @param {number} credits - Credits to deduct
 * @param {string} modelId - Model ID used
 * @param {string} assetId - Generated asset ID
 * @returns {Promise<boolean>} Whether deduction was successful
 */
export async function deductUserCredits(userId, credits, modelId, assetId = null) {
    try {
        throw new Error('deductUserCredits is deprecated. Use generation routes transaction + balance + CreditTransaction(user_id, balance_before/after).');
    } catch (error) {
        console.error('[billing] Error deducting credits:', error);
        return false;
    }
}

/**
 * Check if user has enough credits
 * @param {number} userId 
 * @param {string} modelId 
 * @returns {Promise<{hasEnough: boolean, required: number, current: number}>}
 */
export async function checkUserCredits(userId, modelId) {
    try {
        throw new Error('checkUserCredits is deprecated. Use /api/user/credits and server-side checks in generation routes.');
    } catch (error) {
        console.error('[billing] Error checking credits:', error);
        return { hasEnough: true, required: 0, current: 0 };
    }
}

export default {
    getRequiredCreditsForModel,
    deductUserCredits,
    checkUserCredits
};
