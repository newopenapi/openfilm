/**
 * 文件上传路由
 * 支持腾讯云 COS 和本地存储
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initCOS, TencentCOSService } = require('../services/cos.cjs');
const { authenticate } = require('../middleware/auth.cjs');
const { Asset } = require('../models/index.cjs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../library/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

/**
 * 上传文件到本地存储
 */
router.post('/local', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    const fileUrl = `/library/uploads/${req.file.filename}`;
    
    // 创建资产记录
    const asset = await Asset.create({
      user_id: req.userId,
      asset_type: req.file.mimetype.startsWith('video/') ? 'video' : 
                  req.file.mimetype.startsWith('audio/') ? 'audio' : 'image',
      filename: req.file.originalname,
      file_key: req.file.filename,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      url: fileUrl,
      storage_type: 'local'
    });

    res.json({
      success: true,
      message: '上传成功',
      data: {
        asset,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('上传文件错误:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

/**
 * 获取上传凭证（用于前端直传腾讯云 COS）
 */
router.get('/cos-credential', authenticate, async (req, res) => {
  try {
    const cos = initCOS();
    
    if (!cos.secretId || !cos.secretKey) {
      return res.status(500).json({
        success: false,
        message: '腾讯云 COS 未配置'
      });
    }

    const signature = cos.generateUploadSignature(3600);
    
    res.json({
      success: true,
      data: {
        appId: cos.secretId.split('-')[0],
        bucket: cos.bucket,
        region: cos.region,
        secretId: cos.secretId,
        signature: signature.sign,
        expired: signature.expired,
        startTime: signature.startTime,
        cdnDomain: cos.cdnDomain
      }
    });
  } catch (error) {
    console.error('获取上传凭证错误:', error);
    res.status(500).json({ success: false, message: '获取上传凭证失败' });
  }
});

/**
 * 确认上传完成（前端直传 COS 后调用）
 */
router.post('/cos-confirm', authenticate, async (req, res) => {
  try {
    const { key, filename, fileSize, mimeType } = req.body;
    
    if (!key || !filename) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const cos = initCOS();
    const fileUrl = cos.getUrl(key);

    // 创建资产记录
    const asset = await Asset.create({
      user_id: req.userId,
      asset_type: mimeType?.startsWith('video/') ? 'video' : 
                  mimeType?.startsWith('audio/') ? 'audio' : 'image',
      filename,
      file_key: key,
      file_size: fileSize || 0,
      mime_type: mimeType || 'application/octet-stream',
      url: fileUrl,
      storage_type: 'cos'
    });

    res.json({
      success: true,
      message: '上传确认成功',
      data: {
        asset,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('上传确认错误:', error);
    res.status(500).json({ success: false, message: '上传确认失败' });
  }
});

module.exports = router;
