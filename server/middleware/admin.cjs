/**
 * 管理员权限中间件
 */
const { authenticate } = require('./auth.cjs');

/**
 * 要求是管理员
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }

  next();
};

/**
 * 组合认证和管理员权限
 */
const adminOnly = [authenticate, requireAdmin];

module.exports = {
  requireAdmin,
  adminOnly
};
