/**
 * AI模型管理路由
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { AIModel, ModelPricing, User } = require('../models/index.cjs');
const { adminOnly } = require('../middleware/admin.cjs');

// 应用管理员权限中间件
router.use(adminOnly);

/**
 * 获取所有模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const { category, provider, enabled } = req.query;
    const where = {};
    
    if (category) where.category = category;
    if (provider) where.provider = provider;
    if (enabled !== undefined) where.is_enabled = enabled === 'true';

    const models = await AIModel.findAll({
      where,
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });

    // 获取每个模型的定价
    const modelIds = models.map(m => m.model_id);
    const pricings = await ModelPricing.findAll({
      where: { model_id: modelIds }
    });

    const pricingMap = {};
    pricings.forEach(p => {
      pricingMap[p.model_id] = p;
    });

    const result = models.map(model => ({
      ...model.toJSON(),
      pricing: pricingMap[model.model_id] || null
    }));

    res.json({
      success: true,
      data: { models: result }
    });
  } catch (error) {
    console.error('获取模型列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取模型列表失败'
    });
  }
});

/**
 * 创建模型
 */
router.post('/models', [
  body('model_id').notEmpty().withMessage('模型ID不能为空'),
  body('name').notEmpty().withMessage('模型名称不能为空'),
  body('provider').isIn(['google', 'openai', 'anthropic', 'kling', 'minimax', 'volcano', 'doubao', 'custom']),
  body('category').isIn(['image', 'video', 'audio', 'text', 'chat'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { model_id, name, provider, category, description, api_key, api_url, is_enabled, is_default, sort_order, config } = req.body;

    // 如果设置为默认，先取消其他默认
    if (is_default) {
      await AIModel.update({ is_default: false }, { where: { is_default: true } });
    }

    const model = await AIModel.create({
      model_id,
      name,
      provider,
      category,
      description,
      api_key,
      api_url,
      is_enabled: is_enabled !== false,
      is_default: is_default || false,
      sort_order: sort_order || 0,
      config
    });

    res.status(201).json({
      success: true,
      message: '模型创建成功',
      data: { model }
    });
  } catch (error) {
    console.error('创建模型错误:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: '模型ID已存在'
      });
    }
    res.status(500).json({
      success: false,
      message: '创建模型失败'
    });
  }
});

/**
 * 更新模型
 */
router.put('/models/:id', async (req, res) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: '模型不存在'
      });
    }

    const { name, provider, category, description, api_key, api_url, is_enabled, is_default, sort_order, config } = req.body;

    // 如果设置为默认，先取消其他默认
    if (is_default && !model.is_default) {
      await AIModel.update({ is_default: false }, { where: { is_default: true } });
    }

    await model.update({
      ...(name !== undefined && { name }),
      ...(provider !== undefined && { provider }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(api_key !== undefined && { api_key }),
      ...(api_url !== undefined && { api_url }),
      ...(is_enabled !== undefined && { is_enabled }),
      ...(is_default !== undefined && { is_default }),
      ...(sort_order !== undefined && { sort_order }),
      ...(config !== undefined && { config })
    });

    res.json({
      success: true,
      message: '模型更新成功',
      data: { model }
    });
  } catch (error) {
    console.error('更新模型错误:', error);
    res.status(500).json({
      success: false,
      message: '更新模型失败'
    });
  }
});

/**
 * 删除模型
 */
router.delete('/models/:id', async (req, res) => {
  try {
    const model = await AIModel.findByPk(req.params.id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: '模型不存在'
      });
    }

    // 删除关联的定价
    await ModelPricing.destroy({ where: { model_id: model.model_id } });
    await model.destroy();

    res.json({
      success: true,
      message: '模型删除成功'
    });
  } catch (error) {
    console.error('删除模型错误:', error);
    res.status(500).json({
      success: false,
      message: '删除模型失败'
    });
  }
});

/**
 * 获取模型定价
 */
router.get('/models/:modelId/pricing', async (req, res) => {
  try {
    const pricing = await ModelPricing.findOne({
      where: { model_id: req.params.modelId }
    });

    res.json({
      success: true,
      data: { pricing }
    });
  } catch (error) {
    console.error('获取模型定价错误:', error);
    res.status(500).json({
      success: false,
      message: '获取模型定价失败'
    });
  }
});

/**
 * 设置模型定价
 */
router.post('/models/:modelId/pricing', [
  body('billing_type').isIn(['per_call', 'per_token', 'per_second']).withMessage('无效的计费方式'),
  body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { billing_type, price, price_input, price_output, unit, min_charge, description } = req.body;

    const [pricing, created] = await ModelPricing.findOrCreate({
      where: { model_id: req.params.modelId },
      defaults: {
        billing_type,
        price,
        price_input,
        price_output,
        unit: unit || '次',
        min_charge: min_charge || 1,
        description
      }
    });

    if (!created) {
      await pricing.update({
        billing_type,
        price,
        price_input,
        price_output,
        ...(unit !== undefined && { unit }),
        ...(min_charge !== undefined && { min_charge }),
        ...(description !== undefined && { description })
      });
    }

    res.json({
      success: true,
      message: '定价设置成功',
      data: { pricing }
    });
  } catch (error) {
    console.error('设置模型定价错误:', error);
    res.status(500).json({
      success: false,
      message: '设置模型定价失败'
    });
  }
});

/**
 * 获取支付日志
 */
router.get('/payments', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { type, status, user_id } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (user_id) where.user_id = parseInt(user_id, 10);

    const { count, rows } = await PaymentLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        payments: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取支付日志错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付日志失败'
    });
  }
});

/**
 * 获取支付统计
 */
router.get('/payments/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPayments,
      todayPayments,
      totalAmount,
      todayAmount,
      byType
    ] = await Promise.all([
      PaymentLog.count({ where: { status: 'completed' } }),
      PaymentLog.count({
        where: {
          status: 'completed',
          created_at: { [require('sequelize').Op.gte]: today }
        }
      }),
      PaymentLog.sum('amount', { where: { status: 'completed' } }),
      PaymentLog.sum('amount', {
        where: {
          status: 'completed',
          created_at: { [require('sequelize').Op.gte]: today }
        }
      }),
      PaymentLog.findAll({
        attributes: [
          'type',
          [require('sequelize').fn('COUNT', '*'), 'count'],
          [require('sequelize').fn('SUM', 'amount'), 'total']
        ],
        where: { status: 'completed' },
        group: ['type'],
        raw: true
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        todayPayments,
        totalAmount: totalAmount || 0,
        todayAmount: todayAmount || 0,
        byType
      }
    });
  } catch (error) {
    console.error('获取支付统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取支付统计失败'
    });
  }
});

/**
 * 生成订单号
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD${timestamp}${random}`.toUpperCase();
}

module.exports = router;
