const crypto = require('crypto');
const { randomString, nowSeconds, toPem, toPublicPem, safeJsonParse } = require('./utils.cjs');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function rsaSign(message, privateKeyPem) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message, 'utf8');
  return sign.sign(privateKeyPem, 'base64');
}

function rsaVerify(message, signatureBase64, publicKeyPem) {
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(message, 'utf8');
  return verify.verify(publicKeyPem, signatureBase64, 'base64');
}

function buildAuthorization({ method, urlPath, timestamp, nonceStr, body, mchid, serialNo, privateKeyPem }) {
  const bodyStr = body ? JSON.stringify(body) : '';
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
  const signature = rsaSign(message, privateKeyPem);
  const token = `mchid="${mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
  return { authorization: `WECHATPAY2-SHA256-RSA2048 ${token}`, bodyStr };
}

async function wechatNative({ outTradeNo, amountFen, description, notifyUrl }) {
  const mchid = process.env.WECHATPAY_MCH_ID;
  const appid = process.env.WECHATPAY_APP_ID;
  const serialNo = process.env.WECHATPAY_CERT_SERIAL;
  const privateKeyPem = toPem(process.env.WECHATPAY_PRIVATE_KEY);
  if (!mchid || !appid || !serialNo || !privateKeyPem) {
    throw new Error('WeChat Pay env not configured (WECHATPAY_MCH_ID/WECHATPAY_APP_ID/WECHATPAY_CERT_SERIAL/WECHATPAY_PRIVATE_KEY)');
  }
  const base = process.env.WECHATPAY_API_BASE || 'https://api.mch.weixin.qq.com';
  const urlPath = '/v3/pay/transactions/native';
  const url = `${base}${urlPath}`;

  const body = {
    mchid,
    appid,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: amountFen, currency: 'CNY' }
  };

  const timestamp = String(nowSeconds());
  const nonceStr = randomString(32);
  const { authorization } = buildAuthorization({
    method: 'POST',
    urlPath,
    timestamp,
    nonceStr,
    body,
    mchid,
    serialNo,
    privateKeyPem
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authorization
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  const json = safeJsonParse(text);
  if (!resp.ok) {
    throw new Error(`WeChat Pay error: ${resp.status} ${text.slice(0, 200)}`);
  }
  if (!json?.code_url) {
    throw new Error(`WeChat Pay response missing code_url: ${text.slice(0, 200)}`);
  }

  return { code_url: json.code_url, raw: json };
}

function verifyWechatNotifyHeaders({ timestamp, nonce, serial, signature, rawBody }) {
  const platformCertPem = toPublicPem(process.env.WECHATPAY_PLATFORM_PUBLIC_KEY);
  if (!platformCertPem) {
    return { ok: true, skipped: true };
  }
  if (!timestamp || !nonce || !signature || !rawBody) {
    return { ok: false, skipped: false };
  }
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const ok = rsaVerify(message, signature, platformCertPem);
  return { ok, skipped: false, serial: serial || null };
}

function decryptWechatResource(resource) {
  const apiV3Key = process.env.WECHATPAY_API_V3_KEY;
  if (!apiV3Key || apiV3Key.length < 32) {
    throw new Error('WECHATPAY_API_V3_KEY not configured');
  }
  const { ciphertext, associated_data, nonce } = resource;
  const decoded = Buffer.from(ciphertext, 'base64');
  const authTag = decoded.subarray(decoded.length - 16);
  const data = decoded.subarray(0, decoded.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'));
  if (associated_data) decipher.setAAD(Buffer.from(associated_data, 'utf8'));
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return safeJsonParse(plain.toString('utf8'));
}

module.exports = {
  wechatNative,
  verifyWechatNotifyHeaders,
  decryptWechatResource
};

