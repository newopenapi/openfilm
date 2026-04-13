/**
 * 订阅和积分管理路由
 */
const express = require('express');
const { Op } = require('sequelize');
const { User, SubscriptionPlan, CreditTransaction } = require('../models/index.cjs');
const {
    getAllPlans,
    getUserSubscription,
    updateUserSubscription,
    consumeCredits,
    purchaseCredits,
    getCreditHistory,
    checkDailyLimit,
    getUserCredits
} = require('../services/subscription.cjs');

const router = express.Router();

// 使用认证中间件
const { authenticateToken } = require('../middleware/auth.cjs');

// 所有路由需要登录
router.use(authenticateToken);

/**
 * GET /api/subscription/plans
 * 获取所有可用套餐
 */
router.get('/plans', async (req, res) => {
    try {
        const plans = await getAllPlans();
        res.json({ success: true, plans });
    } catch (error) {
        console.error('[Subscription] Failed to get plans:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

/**
 * GET /api/subscription/current
 * 获取用户当前订阅信息
 */
router.get('/current', async (req, res) => {
    try {
        const subscription = await getUserSubscription(req.user.id);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json({ success: true, subscription });
    } catch (error) {
        console.error('[Subscription] Failed to get current subscription:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});

/**
 * POST /api/subscription/update
 * 更新用户套餐
 */
router.post('/update', async (req, res) => {
    try {
        const { planName } = req.body;
        if (!planName) {
            return res.status(400).json({ error: 'Plan name is required' });
        }

        const result = await updateUserSubscription(req.user.id, planName);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[Subscription] Failed to update subscription:', error);
        res.status(500).json({ error: error.message || 'Failed to update subscription' });
    }
});

/**
 * GET /api/subscription/credits
 * 获取用户积分余额
 */
router.get('/credits', async (req, res) => {
    try {
        const credits = await getUserCredits(req.user.id);
        res.json({ success: true, credits });
    } catch (error) {
        console.error('[Subscription] Failed to get credits:', error);
        res.status(500).json({ error: 'Failed to get credits' });
    }
});

/**
 * POST /api/subscription/consume
 * 消耗积分
 */
router.post('/consume', async (req, res) => {
    try {
        const { amount, description } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const result = await consumeCredits(req.user.id, amount, description || 'Service usage');
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[Subscription] Failed to consume credits:', error);
        res.status(500).json({ error: error.message || 'Failed to consume credits' });
    }
});

/**
 * POST /api/subscription/purchase
 * 充值积分
 */
router.post('/purchase', async (req, res) => {
    try {
        const { amount, paymentId } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const result = await purchaseCredits(req.user.id, amount, paymentId);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[Subscription] Failed to purchase credits:', error);
        res.status(500).json({ error: error.message || 'Failed to purchase credits' });
    }
});

/**
 * GET /api/subscription/history
 * 获取积分交易历史
 */
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const history = await getCreditHistory(req.user.id, limit);
        res.json({ success: true, history });
    } catch (error) {
        console.error('[Subscription] Failed to get credit history:', error);
        res.status(500).json({ error: 'Failed to get credit history' });
    }
});

/**
 * GET /api/subscription/limit/:type
 * 检查每日限额
 */
router.get('/limit/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const result = await checkDailyLimit(req.user.id, type);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[Subscription] Failed to check limit:', error);
        res.status(500).json({ error: 'Failed to check limit' });
    }
});

module.exports = router;
