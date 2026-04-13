/**
 * 管理员路由
 */
const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { User, SystemConfig, SubscriptionPlan, CreditTransaction, Project, Asset, GenerationTask } = require('../models/index.cjs');
const { adminOnly } = require('../middleware/admin.cjs');

// 应用管理员权限中间件
router.use(adminOnly);

/**
 * 获取用户列表
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['admin', 'user']),
  query('status').optional().isIn(['active', 'inactive', 'banned'])
], async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where[require('sequelize').Op.or] = [
        { username: { [require('sequelize').Op.like]: `%${req.query.search}%` } },
        { email: { [require('sequelize').Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * 获取用户详情
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户的统计信息
    const stats = {
      projectCount: await Project.count({ where: { user_id: user.id } }),
      assetCount: await Asset.count({ where: { user_id: user.id } }),
      taskCount: await GenerationTask.count({ where: { user_id: user.id } })
    };

    res.json({
      success: true,
      data: { user, stats }
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

/**
 * 更新用户
 */
router.put('/users/:id', [
  body('role').optional().isIn(['admin', 'user']),
  body('status').optional().isIn(['active', 'inactive', 'banned']),
  body('subscription_type').optional().isIn(['free', 'basic', 'pro', 'enterprise'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 防止将自己的管理员权限降级
    if (req.params.id == req.userId && req.body.role === 'user') {
      return res.status(400).json({
        success: false,
        message: '不能将自己的管理员权限降级'
      });
    }

    const { role, status, subscription_type, subscription_expires_at } = req.body;
    await user.update({
      ...(role && { role }),
      ...(status && { status }),
      ...(subscription_type && { subscription_type }),
      ...(subscription_expires_at !== undefined && { subscription_expires_at })
    });

    res.json({
      success: true,
      message: '用户更新成功',
      data: { user }
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

/**
 * 删除用户
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id == req.userId) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账号'
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

/**
 * 后台充值积分
 */
router.post('/users/:id/credits', [
  body('credits').isInt({ min: 1 }).withMessage('充值积分数量必须大于0'),
  body('description').optional().isLength({ max: 255 }).withMessage('描述不能超过255个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const { credits, description } = req.body;
    const balanceBefore = user.balance;
    const balanceAfter = balanceBefore + credits;

    // 事务处理
    const transaction = await require('sequelize').transaction();
    try {
      // 更新用户余额
      await user.update({ balance: balanceAfter }, { transaction });

      // 记录积分流水
      await CreditTransaction.create({
        user_id: user.id,
        type: 'admin_add',
        credits: credits,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: description || '后台充值',
        operator_id: req.userId
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.json({
      success: true,
      message: `成功为用户 ${user.username} 充值 ${credits} 积分`,
      data: {
        user_id: user.id,
        credits_added: credits,
        balance_before: balanceBefore,
        balance_after: balanceAfter
      }
    });
  } catch (error) {
    console.error('充值积分错误:', error);
    res.status(500).json({
      success: false,
      message: '充值失败'
    });
  }
});

/**
 * 获取用户积分流水
 */
router.get('/users/:id/credits', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await CreditTransaction.findAndCountAll({
      where: { user_id: req.params.id },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取积分流水错误:', error);
    res.status(500).json({
      success: false,
      message: '获取积分流水失败'
    });
  }
});

/**
 * 获取系统配置
 */
router.get('/config', async (req, res) => {
  try {
    const configs = await SystemConfig.findAll({
      order: [['config_key', 'ASC']]
    });

    // 转换为键值对格式
    const configObj = {};
    configs.forEach(c => {
      configObj[c.config_key] = c.config_value;
    });

    res.json({
      success: true,
      data: { configs: configObj, raw: configs }
    });
  } catch (error) {
    console.error('获取系统配置错误:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
});

/**
 * 更新系统配置
 */
router.put('/config/:key', [
  body('config_value').notEmpty().withMessage('配置值不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { key } = req.params;
    const { config_value, description } = req.body;

    const [config, created] = await SystemConfig.findOrCreate({
      where: { config_key: key },
      defaults: {
        config_value,
        description: description || '',
        updated_by: req.userId
      }
    });

    if (!created) {
      await config.update({
        config_value,
        ...(description !== undefined && { description }),
        updated_by: req.userId
      });
    }

    res.json({
      success: true,
      message: '配置更新成功',
      data: { config }
    });
  } catch (error) {
    console.error('更新系统配置错误:', error);
    res.status(500).json({
      success: false,
      message: '更新系统配置失败'
    });
  }
});

/**
 * 获取订阅套餐列表
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('获取订阅套餐错误:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅套餐失败'
    });
  }
});

/**
 * 创建订阅套餐
 */
router.post('/plans', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({
      success: true,
      message: '套餐创建成功',
      data: { plan }
    });
  } catch (error) {
    console.error('创建套餐错误:', error);
    res.status(500).json({
      success: false,
      message: '创建套餐失败'
    });
  }
});

/**
 * 更新订阅套餐
 */
router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '套餐不存在'
      });
    }

    await plan.update(req.body);
    res.json({
      success: true,
      message: '套餐更新成功',
      data: { plan }
    });
  } catch (error) {
    console.error('更新套餐错误:', error);
    res.status(500).json({
      success: false,
      message: '更新套餐失败'
    });
  }
});

/**
 * 获取运营统计
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalAssets,
      totalTasks,
      todayTasks,
      totalCredits
    ] = await Promise.all([
      User.count(),
      User.count({ where: { status: 'active' } }),
      Project.count(),
      Asset.count(),
      GenerationTask.count(),
      GenerationTask.count({
        where: {
          created_at: {
            [require('sequelize').Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      User.sum('balance')
    ]);

    // 获取最近7天的每日任务数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTasks = await GenerationTask.findAll({
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'date'],
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      where: {
        created_at: { [require('sequelize').Op.gte]: sevenDaysAgo }
      },
      group: [require('sequelize').fn('DATE', require('sequelize').col('created_at'))],
      raw: true
    });

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        projects: { total: totalProjects },
        assets: { total: totalAssets },
        tasks: {
          total: totalTasks,
          today: todayTasks,
          recent: recentTasks
        },
        credits: { total: totalCredits || 0 }
      }
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

module.exports = router;
