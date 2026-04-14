const { sequelize, User, PaymentLog, SubscriptionPlan, CreditTransaction } = require('../../models/index.cjs');

async function applyCreditPurchase({ paymentLog, transactionId }) {
  return await sequelize.transaction(async (t) => {
    const locked = await PaymentLog.findOne({ where: { id: paymentLog.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!locked) throw new Error('PaymentLog not found');
    if (locked.status === 'completed') return { already: true };
    if (locked.status !== 'pending') throw new Error(`Invalid payment status: ${locked.status}`);

    const user = await User.findByPk(locked.user_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new Error('User not found');

    const credits = locked.credits || 0;
    if (credits <= 0) throw new Error('Invalid credits');

    const before = user.balance || 0;
    const after = before + credits;

    await user.update({ balance: after }, { transaction: t });
    await CreditTransaction.create({
      user_id: user.id,
      type: 'purchase',
      credits,
      description: `积分充值 x${credits}`,
      balance_before: before,
      balance_after: after
    }, { transaction: t });

    await locked.update({
      status: 'completed',
      transaction_id: transactionId || locked.transaction_id,
      completed_at: new Date()
    }, { transaction: t });

    return { balance: after };
  });
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function applySubscriptionPurchase({ paymentLog, transactionId }) {
  return await sequelize.transaction(async (t) => {
    const locked = await PaymentLog.findOne({ where: { id: paymentLog.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!locked) throw new Error('PaymentLog not found');
    if (locked.status === 'completed') return { already: true };
    if (locked.status !== 'pending') throw new Error(`Invalid payment status: ${locked.status}`);

    const user = await User.findByPk(locked.user_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new Error('User not found');

    const planCode = locked.metadata?.planCode || locked.metadata?.plan_code || null;
    if (!planCode) throw new Error('Missing planCode');
    const plan = await SubscriptionPlan.findOne({ where: { code: planCode }, transaction: t });
    if (!plan) throw new Error('Plan not found');

    const cycle = locked.metadata?.cycle || plan.billing_cycle || 'monthly';
    const now = new Date();
    const base = user.subscription_expires_at && new Date(user.subscription_expires_at) > now ? new Date(user.subscription_expires_at) : now;
    const months = cycle === 'yearly' ? 12 : 1;
    const endDate = addMonths(base, months);

    const creditGrant = plan.monthly_credits || 0;
    const before = user.balance || 0;
    const after = before + creditGrant;

    await user.update({
      subscription_type: planCode,
      subscription_expires_at: endDate,
      balance: after
    }, { transaction: t });

    await CreditTransaction.create({
      user_id: user.id,
      type: 'subscription',
      credits: creditGrant,
      description: `订阅 ${plan.name}`,
      balance_before: before,
      balance_after: after
    }, { transaction: t });

    await locked.update({
      status: 'completed',
      transaction_id: transactionId || locked.transaction_id,
      completed_at: new Date()
    }, { transaction: t });

    return { endDate, balance: after };
  });
}

module.exports = {
  applyCreditPurchase,
  applySubscriptionPurchase
};

