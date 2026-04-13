/**
 * 订阅服务 - 处理用户订阅、套餐管理和积分操作
 */
const { User, SubscriptionPlan, CreditTransaction } = require('../models/index.cjs');
const { Op } = require('sequelize');

// 套餐定义（默认数据）
const DEFAULT_PLANS = [
    {
        name: 'Free',
        displayName: '免费版',
        description: '适合轻度用户试用',
        price: 0,
        credits: 100,
        billingPeriod: 'monthly',
        features: ['100积分/月', '基础图像生成', '480p视频生成', '社区支持'],
        limits: {
            imagesPerDay: 10,
            videosPerDay: 2,
            projects: 3,
            collaborators: 0
        }
    },
    {
        name: 'Basic',
        displayName: '基础版',
        description: '适合个人创作者',
        price: 29,
        credits: 500,
        billingPeriod: 'monthly',
        features: ['500积分/月', '高清图像生成', '720p视频生成', '10个项目', ' Email支持'],
        limits: {
            imagesPerDay: 50,
            videosPerDay: 10,
            projects: 10,
            collaborators: 1
        }
    },
    {
        name: 'Pro',
        displayName: '专业版',
        description: '适合专业创作者',
        price: 99,
        credits: 2000,
        billingPeriod: 'monthly',
        features: ['2000积分/月', '4K图像生成', '1080p视频生成', '无限项目', '实时协作(3人)', '优先支持'],
        limits: {
            imagesPerDay: 200,
            videosPerDay: 50,
            projects: -1, // 无限
            collaborators: 3
        }
    },
    {
        name: 'Enterprise',
        displayName: '企业版',
        description: '适合团队和企业',
        price: 299,
        credits: 10000,
        billingPeriod: 'monthly',
        features: ['10000积分/月', '原始质量图像', '4K视频生成', '无限项目', '实时协作(无限)', '专属支持', 'API访问', '自定义套餐'],
        limits: {
            imagesPerDay: -1,
            videosPerDay: -1,
            projects: -1,
            collaborators: -1
        }
    }
];

/**
 * 初始化默认套餐到数据库
 */
async function initializePlans() {
    try {
        for (const plan of DEFAULT_PLANS) {
            await SubscriptionPlan.findOrCreate({
                where: { name: plan.name },
                defaults: plan
            });
        }
        console.log('[Subscription] Default plans initialized');
    } catch (error) {
        console.error('[Subscription] Failed to initialize plans:', error);
    }
}

/**
 * 获取所有可用套餐
 */
async function getAllPlans() {
    try {
        return await SubscriptionPlan.findAll({
            order: [['price', 'ASC']]
        });
    } catch (error) {
        console.error('[Subscription] Failed to get plans:', error);
        return DEFAULT_PLANS;
    }
}

/**
 * 获取用户当前套餐信息
 */
async function getUserSubscription(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return null;
        }

        // 使用 code 字段匹配 ('free', 'basic', 'pro', 'enterprise')
        const planCode = user.subscription_type || 'free';
        const plan = await SubscriptionPlan.findOne({
            where: { code: planCode }
        });

        // 计算当月已用积分
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const creditsUsed = await CreditTransaction.sum('credits', {
            where: {
                user_id: userId,
                type: 'generation',
                created_at: { [Op.gte]: startOfMonth }
            }
        }) || 0;

        return {
            plan: plan || DEFAULT_PLANS[0],
            creditsTotal: plan?.monthly_credits || 50,
            creditsUsed: Math.abs(creditsUsed),
            creditsRemaining: (plan?.monthly_credits || 50) - Math.abs(creditsUsed),
            subscriptionEndDate: user.subscription_expires_at,
            isActive: user.subscription_expires_at ? new Date(user.subscription_expires_at) > new Date() : true
        };
    } catch (error) {
        console.error('[Subscription] Failed to get user subscription:', error);
        return null;
    }
}

/**
 * 更新用户套餐
 */
async function updateUserSubscription(userId, planName) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const plan = await SubscriptionPlan.findOne({ where: { code: planName } });
        if (!plan) {
            throw new Error('Plan not found');
        }

        // 计算订阅结束日期
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        await user.update({
            subscription_type: planName,
            subscription_expires_at: endDate
        });

        // 记录积分变更
        await CreditTransaction.create({
            user_id: userId,
            type: 'subscription',
            credits: plan.monthly_credits,
            description: `订阅 ${plan.name}`,
            balance_before: 0,
            balance_after: plan.monthly_credits
        });

        return { success: true, plan: planName, endDate };
    } catch (error) {
        console.error('[Subscription] Failed to update subscription:', error);
        throw error;
    }
}

/**
 * 消耗积分
 */
async function consumeCredits(userId, amount, description) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // 获取用户订阅信息
        const subscription = await getUserSubscription(userId);
        if (!subscription || subscription.creditsRemaining < amount) {
            return { success: false, error: 'Insufficient credits', remaining: subscription?.creditsRemaining || 0 };
        }

        // 记录积分消费
        const newBalance = subscription.creditsRemaining - amount;
        await CreditTransaction.create({
            user_id: userId,
            type: 'generation',
            credits: -amount,
            description,
            balance_before: newBalance + amount,
            balance_after: newBalance
        });

        return { success: true, creditsUsed: amount, remaining: newBalance };
    } catch (error) {
        console.error('[Subscription] Failed to consume credits:', error);
        throw error;
    }
}

/**
 * 充值积分
 */
async function purchaseCredits(userId, amount, paymentId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // 获取当前余额
        const lastTransaction = await CreditTransaction.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
        const currentBalance = lastTransaction?.balance_after || user.balance || 0;
        const newBalance = currentBalance + amount;

        // 记录充值
        await CreditTransaction.create({
            user_id: userId,
            type: 'purchase',
            credits: amount,
            description: `积分充值 x${amount}`,
            balance_before: currentBalance,
            balance_after: newBalance
        });

        // 更新用户积分
        await user.update({ balance: newBalance });

        return { success: true, amount, newBalance };
    } catch (error) {
        console.error('[Subscription] Failed to purchase credits:', error);
        throw error;
    }
}

/**
 * 获取积分交易历史
 */
async function getCreditHistory(userId, limit = 20) {
    try {
        const transactions = await CreditTransaction.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit
        });
        return transactions;
    } catch (error) {
        console.error('[Subscription] Failed to get credit history:', error);
        return [];
    }
}

/**
 * 检查用户每日限额
 */
async function checkDailyLimit(userId, limitType) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }

        const planCode = user.subscription_type || 'free';
        const plan = await SubscriptionPlan.findOne({
            where: { code: planCode }
        });
        const limit = plan?.daily_generation_limit || 5;

        // 0 表示无限
        if (limit === 0) {
            return { allowed: true, used: 0, limit: 0 };
        }

        // 计算今日使用量
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayUsage = await CreditTransaction.count({
            where: {
                user_id: userId,
                type: 'generation',
                created_at: { [Op.gte]: startOfDay }
            }
        });

        return {
            allowed: todayUsage < limit,
            used: todayUsage,
            limit
        };
    } catch (error) {
        console.error('[Subscription] Failed to check daily limit:', error);
        return { allowed: true, used: 0, limit: -1 };
    }
}

/**
 * 获取用户积分余额
 */
async function getUserCredits(userId) {
    try {
        const user = await User.findByPk(userId);
        const lastTransaction = await CreditTransaction.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
        return lastTransaction?.balance_after || user?.balance || 0;
    } catch (error) {
        console.error('[Subscription] Failed to get user credits:', error);
        return 0;
    }
}

module.exports = {
    initializePlans,
    getAllPlans,
    getUserSubscription,
    updateUserSubscription,
    consumeCredits,
    purchaseCredits,
    getCreditHistory,
    checkDailyLimit,
    getUserCredits
};
