const express = require('express');
const { PaymentLog, SubscriptionPlan } = require('../models/index.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { generateOrderId, safeJsonParse } = require('../services/payments/utils.cjs');
const { alipayPrecreate, verifyAlipayNotify } = require('../services/payments/alipay.cjs');
const { wechatNative, verifyWechatNotifyHeaders, decryptWechatResource } = require('../services/payments/wechatpay.cjs');
const { applyCreditPurchase, applySubscriptionPurchase } = require('../services/payments/apply.cjs');

const router = express.Router();

const CREDIT_PACKAGES = [
  { credits: 200, amount: 19.9 },
  { credits: 500, amount: 49.9 },
  { credits: 2000, amount: 199 },
  { credits: 10000, amount: 999 }
];

function getNotifyBaseUrl(req) {
  const base = process.env.PUBLIC_API_BASE_URL;
  if (base) return base.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host')).toString().split(',')[0].trim();
  return `${proto}://${host}`;
}

function toFen(amountYuan) {
  return Math.round(Number(amountYuan) * 100);
}

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { provider, kind } = req.body || {};
    if (!provider || !['alipay', 'wechat'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'provider must be alipay|wechat' });
    }
    if (!kind || !['subscription', 'credits'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'kind must be subscription|credits' });
    }

    let amount = null;
    let credits = null;
    let type = null;
    let metadata = {};
    let subject = '';

    if (kind === 'credits') {
      const pkgCredits = Number(req.body.credits);
      const pkg = CREDIT_PACKAGES.find(p => p.credits === pkgCredits);
      if (!pkg) {
        return res.status(400).json({ success: false, message: 'invalid credits package' });
      }
      amount = pkg.amount;
      credits = pkg.credits;
      type = 'credit_purchase';
      subject = `积分充值 ${credits}`;
      metadata = { kind: 'credits', credits };
    } else {
      const planCode = String(req.body.planCode || '');
      const cycle = String(req.body.cycle || 'monthly');
      if (!planCode) {
        return res.status(400).json({ success: false, message: 'planCode is required' });
      }
      const plan = await SubscriptionPlan.findOne({ where: { code: planCode } });
      if (!plan) {
        return res.status(404).json({ success: false, message: 'plan not found' });
      }
      if (plan.price <= 0) {
        return res.status(400).json({ success: false, message: 'free plan does not require payment' });
      }
      if (!['monthly', 'yearly'].includes(cycle)) {
        return res.status(400).json({ success: false, message: 'cycle must be monthly|yearly' });
      }
      amount = Number(plan.price);
      if (cycle === 'yearly') amount = Math.round(amount * 12 * 100) / 100;
      credits = plan.monthly_credits || null;
      type = 'subscription';
      subject = `订阅套餐 ${plan.name}`;
      metadata = { kind: 'subscription', planCode, cycle };
    }

    const orderId = generateOrderId('PAY');
    const notifyBase = getNotifyBaseUrl(req);
    const notifyUrl = provider === 'alipay'
      ? `${notifyBase}/api/payments/notify/alipay`
      : `${notifyBase}/api/payments/notify/wechat`;

    const payment = await PaymentLog.create({
      order_id: orderId,
      user_id: req.user.id,
      type,
      amount,
      credits,
      status: 'pending',
      payment_method: provider,
      metadata
    });

    let qr = null;
    if (process.env.PAYMENTS_MODE === 'mock') {
      qr = `mock://${provider}/${orderId}`;
      await payment.update({ metadata: { ...metadata, qr } });
      return res.json({ success: true, orderId, provider, qr, status: payment.status });
    }

    if (provider === 'alipay') {
      const r = await alipayPrecreate({ outTradeNo: orderId, totalAmount: amount, subject, notifyUrl });
      qr = r.qr_code;
      await payment.update({ metadata: { ...metadata, qr, raw: r.raw } });
    } else {
      const r = await wechatNative({
        outTradeNo: orderId,
        amountFen: toFen(amount),
        description: subject,
        notifyUrl
      });
      qr = r.code_url;
      await payment.update({ metadata: { ...metadata, qr, raw: r.raw } });
    }

    res.json({ success: true, orderId, provider, qr, status: 'pending' });
  } catch (error) {
    console.error('[Payments] create failed:', error);
    res.status(500).json({ success: false, message: error.message || 'create failed' });
  }
});

router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await PaymentLog.findOne({ where: { order_id: orderId, user_id: req.user.id } });
    if (!payment) return res.status(404).json({ success: false, message: 'order not found' });
    res.json({ success: true, order: { orderId: payment.order_id, status: payment.status, amount: payment.amount, credits: payment.credits, type: payment.type } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'failed' });
  }
});

router.post('/notify/alipay', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const params = req.body || {};
    const ok = verifyAlipayNotify(params);
    if (!ok) {
      return res.status(400).send('fail');
    }

    const outTradeNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;
    if (!outTradeNo) return res.status(400).send('fail');

    const payment = await PaymentLog.findOne({ where: { order_id: outTradeNo } });
    if (!payment) return res.status(404).send('fail');
    if (payment.status === 'completed') return res.send('success');

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      if (payment.type === 'credit_purchase') {
        await applyCreditPurchase({ paymentLog: payment, transactionId: tradeNo });
      } else if (payment.type === 'subscription') {
        await applySubscriptionPurchase({ paymentLog: payment, transactionId: tradeNo });
      } else {
        await payment.update({ status: 'completed', transaction_id: tradeNo, completed_at: new Date() });
      }
      return res.send('success');
    }

    await payment.update({ status: 'failed', transaction_id: tradeNo });
    res.send('success');
  } catch (error) {
    console.error('[Payments] alipay notify failed:', error);
    res.status(500).send('fail');
  }
});

router.post('/notify/wechat', async (req, res) => {
  try {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const timestamp = req.get('Wechatpay-Timestamp');
    const nonce = req.get('Wechatpay-Nonce');
    const serial = req.get('Wechatpay-Serial');
    const signature = req.get('Wechatpay-Signature');

    const verified = verifyWechatNotifyHeaders({ timestamp, nonce, serial, signature, rawBody });
    if (!verified.ok) {
      return res.status(401).json({ code: 'FAIL', message: 'signature invalid' });
    }

    const body = typeof req.body === 'object' ? req.body : safeJsonParse(rawBody);
    const resource = body?.resource;
    if (!resource) return res.status(400).json({ code: 'FAIL', message: 'missing resource' });
    const plain = decryptWechatResource(resource);
    if (!plain) return res.status(400).json({ code: 'FAIL', message: 'decrypt failed' });

    const outTradeNo = plain.out_trade_no;
    const transactionId = plain.transaction_id;
    const tradeState = plain.trade_state;
    if (!outTradeNo) return res.status(400).json({ code: 'FAIL', message: 'missing out_trade_no' });

    const payment = await PaymentLog.findOne({ where: { order_id: outTradeNo } });
    if (!payment) return res.status(404).json({ code: 'FAIL', message: 'order not found' });
    if (payment.status === 'completed') return res.json({ code: 'SUCCESS', message: 'OK' });

    if (tradeState === 'SUCCESS') {
      if (payment.type === 'credit_purchase') {
        await applyCreditPurchase({ paymentLog: payment, transactionId });
      } else if (payment.type === 'subscription') {
        await applySubscriptionPurchase({ paymentLog: payment, transactionId });
      } else {
        await payment.update({ status: 'completed', transaction_id: transactionId, completed_at: new Date() });
      }
      return res.json({ code: 'SUCCESS', message: 'OK' });
    }

    await payment.update({ status: 'failed', transaction_id: transactionId });
    res.json({ code: 'SUCCESS', message: 'OK' });
  } catch (error) {
    console.error('[Payments] wechat notify failed:', error);
    res.status(500).json({ code: 'FAIL', message: 'server error' });
  }
});

router.post('/mock/complete', authenticateToken, async (req, res) => {
  try {
    if (process.env.PAYMENTS_MODE !== 'mock') {
      return res.status(404).json({ success: false });
    }
    const { orderId } = req.body || {};
    const payment = await PaymentLog.findOne({ where: { order_id: orderId, user_id: req.user.id } });
    if (!payment) return res.status(404).json({ success: false, message: 'order not found' });
    if (payment.status === 'completed') return res.json({ success: true });
    const tx = `MOCK_${Date.now()}`;
    if (payment.type === 'credit_purchase') await applyCreditPurchase({ paymentLog: payment, transactionId: tx });
    if (payment.type === 'subscription') await applySubscriptionPurchase({ paymentLog: payment, transactionId: tx });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;

