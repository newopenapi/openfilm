/**
 * 腾讯云 COS 服务
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const COS = require('cos-nodejs-sdk-v5');

// 简单的 COS 签名实现（兼容腾讯云 COS SDK）
class TencentCOSService {
  constructor(config) {
    this.secretId = config.secretId;
    this.secretKey = config.secretKey;
    this.region = config.region;
    this.bucket = config.bucket;
    this.cdnDomain = config.cdnDomain || '';
    this.cos = new COS({
      SecretId: this.secretId,
      SecretKey: this.secretKey
    });
  }

  /**
   * 生成上传签名（简单版）
   */
  generateUploadSignature(expires = 3600) {
    const current = Math.round(Date.now() / 1000);
    const expired = current + expires;

    const signatureStr = `a=${this.secretId}&b=${this.bucket}&k=${this.secretKey}&e=${expired}&t=${current}`;
    const signature = crypto.createHmac('sha1', this.secretKey)
      .update(signatureStr)
      .digest('hex');

    return {
      sign: signature,
      expired: expired,
      startTime: current
    };
  }

  /**
   * 生成上传路径
   */
  generateKey(filename, userId) {
    const ext = path.extname(filename);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    const nameWithoutExt = path.basename(filename, ext);
    
    return `uploads/${userId}/${timestamp}-${randomStr}-${nameWithoutExt}${ext}`;
  }

  /**
   * 获取访问 URL
   */
  getUrl(key) {
    if (this.cdnDomain) {
      return `${this.cdnDomain}/${key}`;
    }
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }

  /**
   * 检查文件是否存在（通过 HEAD 请求）
   */
  async exists(key) {
    try {
      await this.cos.headObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key
      });
      return true;
    } catch (err) {
      if (err && (err.statusCode === 404 || err.code === 'NoSuchKey')) return false;
      return false;
    }
  }

  /**
   * 删除文件
   */
  async delete(key) {
    await this.cos.deleteObject({
      Bucket: this.bucket,
      Region: this.region,
      Key: key
    });
    return true;
  }

  async uploadBuffer(buffer, key, contentType) {
    await this.cos.putObject({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Body: buffer,
      ContentType: contentType || undefined
    });
    return { key, url: this.getUrl(key) };
  }
}

// 创建单例实例
let cosService = null;

const initCOS = () => {
  if (cosService) return cosService;

  cosService = new TencentCOSService({
    secretId: process.env.TENCENT_COS_SECRET_ID || process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '',
    region: process.env.TENCENT_COS_REGION || process.env.TENCENT_REGION || 'ap-beijing',
    bucket: process.env.TENCENT_COS_BUCKET || process.env.TENCENT_BUCKET || 'openfilm-assets',
    cdnDomain: process.env.TENCENT_COS_CDN_DOMAIN || process.env.TENCENT_CDN_DOMAIN || ''
  });

  return cosService;
};

module.exports = {
  TencentCOSService,
  initCOS,
  getCOS: () => cosService
};
