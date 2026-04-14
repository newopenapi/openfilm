/**
 * 用户 API 路由 (CommonJS 版本)
 */
const express = require('express');
const router = express.Router();
const { User, Project, Asset, History, GenerationTask, CreditTransaction } = require('../models/index.cjs');
const { authenticate } = require('../middleware/auth.cjs');

/**
 * 获取当前用户信息
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

/**
 * 更新当前用户信息
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    await user.update({
      ...(username && { username }),
      ...(avatar_url !== undefined && { avatar_url })
    });

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: { user }
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
});

/**
 * 修改密码
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6个字符'
      });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码
    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: hash });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

/**
 * 获取用户积分余额
 */
router.get('/credits', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'username', 'balance', 'subscription_type']
    });

    res.json({
      success: true,
      data: {
        balance: user.balance,
        subscription_type: user.subscription_type
      }
    });
  } catch (error) {
    console.error('获取积分余额错误:', error);
    res.status(500).json({
      success: false,
      message: '获取积分余额失败'
    });
  }
});

/**
 * 获取积分流水记录
 */
router.get('/credits/history', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await CreditTransaction.findAndCountAll({
      where: { user_id: req.userId },
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
 * 获取用户项目列表
 */
router.get('/projects', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Project.findAndCountAll({
      where: { user_id: req.userId },
      limit,
      offset,
      order: [['updated_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        projects: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败'
    });
  }
});

/**
 * 获取项目详情
 */
router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败'
    });
  }
});

/**
 * 创建项目
 */
router.post('/projects', authenticate, async (req, res) => {
  try {
    const { name, description, data } = req.body;

    const project = await Project.create({
      user_id: req.userId,
      name: name || '未命名项目',
      description: description || '',
      data: data || {},
      version: 1
    });

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: { project }
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
});

/**
 * 更新项目
 */
router.put('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    const { name, description, data } = req.body;
    await project.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(data !== undefined && { data }),
      version: project.version + 1
    });

    res.json({
      success: true,
      message: '项目更新成功',
      data: { project }
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    res.status(500).json({
      success: false,
      message: '更新项目失败'
    });
  }
});

/**
 * 删除项目
 */
router.delete('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    await project.destroy();

    res.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({
      success: false,
      message: '删除项目失败'
    });
  }
});

/**
 * 获取资产列表
 */
router.get('/assets', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type; // image, video, audio

    const where = { user_id: req.userId };
    if (type) where.asset_type = type;

    const { count, rows } = await Asset.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        assets: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取资产列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取资产列表失败'
    });
  }
});

/**
 * 删除资产
 */
router.delete('/assets/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: '资产不存在'
      });
    }

    await asset.destroy();

    res.json({
      success: true,
      message: '资产删除成功'
    });
  } catch (error) {
    console.error('删除资产错误:', error);
    res.status(500).json({
      success: false,
      message: '删除资产失败'
    });
  }
});

/**
 * 获取历史记录
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await History.findAndCountAll({
      where: { user_id: req.userId },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
    });

    res.json({
      success: true,
      data: {
        history: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取历史记录失败'
    });
  }
});

module.exports = router;
