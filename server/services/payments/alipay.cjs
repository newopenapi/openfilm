const crypto = require('crypto');
const { randomString, nowSeconds, toPem, toPublicPem } = require('./utils.cjs');

function buildSignString(params) {
  const keys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '').sort();
  return keys.map(k => `${k}=${params[k]}`).join('&');
}

function rsa2Sign(content, privateKeyPem) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(content, 'utf8');
  return sign.sign(privateKeyPem, 'base64');
}

function rsa2Verify(content, signature, publicKeyPem) {
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(content, 'utf8');
  return verify.verify(publicKeyPem, signature, 'base64');
}

async function alipayPrecreate({ outTradeNo, totalAmount, subject, notifyUrl }) {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKeyPem = toPem(process.env.ALIPAY_PRIVATE_KEY);
  const alipayPublicKeyPem = toPublicPem(process.env.ALIPAY_PUBLIC_KEY);
  if (!appId || !privateKeyPem || !alipayPublicKeyPem) {
    throw new Error('Alipay env not configured (ALIPAY_APP_ID/ALIPAY_PRIVATE_KEY/ALIPAY_PUBLIC_KEY)');
  }

  const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
  const method = 'alipay.trade.precreate';
  const charset = 'utf-8';
  const signType = 'RSA2';
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const bizContent = JSON.stringify({
    out_trade_no: outTradeNo,
    total_amount: String(totalAmount),
    subject,
    timeout_express: '30m'
  });

  const params = {
    app_id: appId,
    method,
    format: 'JSON',
    charset,
    sign_type: signType,
    timestamp,
    version: '1.0',
    notify_url: notifyUrl,
    biz_content: bizContent
  };

  const signString = buildSignString(params);
  const signature = rsa2Sign(signString, privateKeyPem);
  const body = new URLSearchParams({ ...params, sign: signature });

  const resp = await fetch(gateway, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body
  });

  const text = await resp.text();
  const json = (() => {
    try { return JSON.parse(text); } catch { return null; }
  })();
  if (!json) throw new Error(`Alipay response parse failed: ${text.slice(0, 200)}`);

  const key = 'alipay_trade_precreate_response';
  const data = json[key];
  if (!data) throw new Error(`Alipay response missing ${key}`);
  if (data.code !== '10000') {
    throw new Error(`Alipay error ${data.code}: ${data.sub_msg || data.msg || 'unknown'}`);
  }

  return {
    qr_code: data.qr_code,
    alipay_trade_no: data.trade_no || null,
    raw: json
  };
}

function verifyAlipayNotify(params) {
  const alipayPublicKeyPem = toPublicPem(process.env.ALIPAY_PUBLIC_KEY);
  if (!alipayPublicKeyPem) throw new Error('ALIPAY_PUBLIC_KEY not configured');
  const signature = params.sign;
  const signType = params.sign_type;
  if (!signature) return false;
  if (signType && String(signType).toUpperCase() !== 'RSA2') return false;
  const contentParams = { ...params };
  delete contentParams.sign;
  delete contentParams.sign_type;
  const content = buildSignString(contentParams);
  return rsa2Verify(content, signature, alipayPublicKeyPem);
}

module.exports = {
  alipayPrecreate,
  verifyAlipayNotify
};

