import React, { useEffect, useMemo, useState } from 'react';
import { X, CreditCard, Receipt, Settings, HelpCircle, LogOut, Crown, Sparkles } from 'lucide-react';
import { apiRequest, changePassword, getCurrentUser, getMe, logout, updateProfile } from '../services/authService';
import { getLanguage, setLanguage } from '../i18n';

type SectionKey = 'subscription' | 'recharge' | 'billing' | 'profile' | 'tutorial';

interface SubscriptionPlan {
  id: number;
  name: string;
  code?: string;
  price: number;
  billing_cycle?: string;
  monthly_credits?: number;
  features?: any;
  status?: string;
}

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  subscriptionEndDate: string;
  isActive: boolean;
}

interface CreditTransaction {
  id: number;
  type: string;
  credits: number;
  description: string;
  balance_after?: number;
  created_at?: string;
}

const formatMoney = (amount: number) => {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export function AccountPage({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<SectionKey>('billing');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planCycle, setPlanCycle] = useState<'monthly' | 'yearly' | 'enterprise'>('monthly');

  const [profileUsername, setProfileUsername] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [uiLanguage, setUiLanguage] = useState<'zh' | 'en'>(getLanguage());
  const [payOpen, setPayOpen] = useState(false);
  const [payProvider, setPayProvider] = useState<'alipay' | 'wechat'>('alipay');
  const [payOrderId, setPayOrderId] = useState<string | null>(null);
  const [payQr, setPayQr] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<'idle' | 'creating' | 'pending' | 'completed' | 'failed'>('idle');

  const rechargeOptions = useMemo(() => ([
    { credits: 200, price: 19.9 },
    { credits: 500, price: 49.9 },
    { credits: 2000, price: 199 },
    { credits: 10000, price: 999 }
  ]), []);

  const availableCycles = useMemo(() => {
    const set = new Set((plans || []).map(p => p.billing_cycle).filter(Boolean) as string[]);
    const cycles: Array<'monthly' | 'yearly' | 'enterprise'> = [];
    if (set.has('monthly')) cycles.push('monthly');
    if (set.has('yearly')) cycles.push('yearly');
    cycles.push('enterprise');
    return cycles;
  }, [plans]);

  useEffect(() => {
    if (planCycle !== 'enterprise' && !availableCycles.includes(planCycle)) {
      setPlanCycle(availableCycles.includes('monthly') ? 'monthly' : availableCycles.includes('yearly') ? 'yearly' : 'enterprise');
    }
  }, [availableCycles, planCycle]);

  const plansForCycle = useMemo(() => {
    if (planCycle === 'enterprise') {
      return [];
    }
    return (plans || [])
      .filter(p => p.billing_cycle === planCycle)
      .slice()
      .sort((a, b) => (a.price || 0) - (b.price || 0));
  }, [plans, planCycle]);

  const yearlyDiscountPercent = useMemo(() => {
    const byName: Record<string, { monthly?: SubscriptionPlan; yearly?: SubscriptionPlan }> = {};
    for (const p of plans || []) {
      const key = (p.code || p.name || '').toLowerCase();
      if (!key) continue;
      byName[key] = byName[key] || {};
      if (p.billing_cycle === 'monthly') byName[key].monthly = p;
      if (p.billing_cycle === 'yearly') byName[key].yearly = p;
    }
    let best = 0;
    for (const k of Object.keys(byName)) {
      const pair = byName[k];
      if (!pair.monthly || !pair.yearly) continue;
      const m = pair.monthly.price;
      const y = pair.yearly.price;
      if (!Number.isFinite(m) || !Number.isFinite(y) || m <= 0) continue;
      const off = Math.round((1 - y / (m * 12)) * 100);
      if (off > best) best = off;
    }
    if (best <= 0) return null;
    if (best > 80) return 80;
    return best;
  }, [plans]);

  const pickBadges = (idx: number, total: number, plan: SubscriptionPlan) => {
    const name = (plan.code || plan.name || '').toLowerCase();
    if (name.includes('pro')) return { label: '最受欢迎', tone: 'blue' as const };
    if (name.includes('max') || name.includes('ultimate')) return { label: '最佳性价比', tone: 'emerald' as const };
    if (total >= 4 && idx === 1) return { label: '最受欢迎', tone: 'blue' as const };
    if (total >= 4 && idx === total - 1) return { label: '最佳性价比', tone: 'emerald' as const };
    return null;
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subRes, historyRes, creditsRes] = await Promise.all([
        apiRequest<any>('/subscription/plans'),
        apiRequest<any>('/subscription/current'),
        apiRequest<any>('/subscription/history'),
        apiRequest<any>('/user/credits')
      ]);
      await getMe();

      if (plansRes?.plans) setPlans(plansRes.plans);
      if (subRes?.subscription) setSubscription(subRes.subscription);
      if (historyRes?.history) setHistory(historyRes.history);
      if (typeof creditsRes?.data?.balance === 'number') setBalance(creditsRes.data.balance);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, creditsRes] = await Promise.all([
        apiRequest<any>('/user/credits/history?limit=50&page=1'),
        apiRequest<any>('/user/credits')
      ]);
      const txs = historyRes?.data?.transactions || [];
      setHistory(txs);
      if (typeof creditsRes?.data?.balance === 'number') setBalance(creditsRes.data.balance);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active === 'billing') {
      loadBilling();
      return;
    }
    loadAll();
  }, [active]);

  useEffect(() => {
    if (active !== 'profile') return;
    const u = getCurrentUser();
    if (!u) return;
    setProfileUsername(u.username || '');
    const bioKey = `openfilm-user-bio-${u.id}`;
    setProfileBio(localStorage.getItem(bioKey) || '');
  }, [active]);

  const handleSubscribe = async (planName: string) => {
    setPayOpen(true);
    setPayStatus('creating');
    setError(null);
    try {
      const r: any = await apiRequest('/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          provider: payProvider,
          kind: 'subscription',
          planCode: planName,
          cycle: planCycle
        })
      });
      setPayOrderId(r.orderId);
      setPayQr(r.qr);
      setPayStatus('pending');
    } catch (e: any) {
      setPayStatus('idle');
      setError(e?.message || '创建支付失败');
    }
  };

  const handlePurchase = async (credits: number) => {
    setPayOpen(true);
    setPayStatus('creating');
    setError(null);
    try {
      const r: any = await apiRequest('/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          provider: payProvider,
          kind: 'credits',
          credits
        })
      });
      setPayOrderId(r.orderId);
      setPayQr(r.qr);
      setPayStatus('pending');
    } catch (e: any) {
      setPayStatus('idle');
      setError(e?.message || '创建支付失败');
    }
  };

  useEffect(() => {
    if (!payOpen || !payOrderId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r: any = await apiRequest(`/payments/${payOrderId}`);
        const st = r?.order?.status;
        if (st === 'completed') {
          setPayStatus('completed');
          await loadAll();
          return;
        }
        if (st === 'failed') {
          setPayStatus('failed');
          return;
        }
      } catch {
      }
      if (!stopped) setTimeout(tick, 2000);
    };
    tick();
    return () => { stopped = true; };
  }, [payOpen, payOrderId]);

  const handleSaveProfile = async () => {
    const u = getCurrentUser();
    setLoading(true);
    setError(null);
    try {
      await updateProfile({
        ...(profileUsername.trim() ? { username: profileUsername.trim() } : {}),
      });
      if (u?.id) {
        const bioKey = `openfilm-user-bio-${u.id}`;
        localStorage.setItem(bioKey, profileBio.slice(0, 200));
      }
      await loadAll();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await changePassword(currentPassword, newPassword);
      if (!ok) throw new Error('修改失败');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setError(e?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-6 rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#111] to-[#0b0b0b] shadow-2xl overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-neutral-800 bg-black/40 hover:bg-black/60 flex items-center justify-center text-neutral-300 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-full w-full grid grid-cols-[260px_1fr]">
          <div className="h-full border-r border-neutral-900 bg-black/20">
            <div className="px-5 pt-6 pb-4">
              <div className="text-sm text-neutral-400">账户管理</div>
              <div className="mt-1 text-xl font-semibold text-white">账单与充值</div>
            </div>

            <div className="px-3 py-2">
              <div className="text-xs text-neutral-500 px-3 mb-2">订阅和充值</div>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === 'subscription' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                onClick={() => setActive('subscription')}
              >
                <Crown size={18} />
                <span className="text-sm font-medium">订阅套餐</span>
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === 'recharge' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                onClick={() => setActive('recharge')}
              >
                <Sparkles size={18} />
                <span className="text-sm font-medium">充值积分</span>
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === 'billing' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                onClick={() => setActive('billing')}
              >
                <Receipt size={18} />
                <span className="text-sm font-medium">账单记录</span>
              </button>
            </div>

            <div className="px-3 py-2">
              <div className="text-xs text-neutral-500 px-3 mb-2">通用设置</div>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === 'profile' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                onClick={() => setActive('profile')}
              >
                <Settings size={18} />
                <span className="text-sm font-medium">个人设置</span>
              </button>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === 'tutorial' ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5'}`}
                onClick={() => setActive('tutorial')}
              >
                <HelpCircle size={18} />
                <span className="text-sm font-medium">使用教程</span>
              </button>
            </div>

            <div className="absolute left-6 bottom-6 right-[calc(100%-260px+24px)]">
              <button
                onClick={handleLogout}
                className="w-[212px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">登出账号</span>
              </button>
              <div className="mt-4 text-xs text-neutral-600">v2.4.3</div>
            </div>
          </div>

          <div className="h-full">
            <div className="px-8 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="text-xl font-semibold text-white">
                  {active === 'subscription' ? '订阅套餐' : active === 'recharge' ? '充值积分' : active === 'billing' ? '账单记录' : active === 'profile' ? '个人设置' : '使用教程'}
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-full border border-neutral-800 bg-black/30 text-neutral-200 text-sm flex items-center gap-2">
                    <CreditCard size={16} className="text-neutral-300" />
                    <span>{balance === null ? '-' : balance.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => active === 'billing' ? loadBilling() : loadAll()}
                    className="px-3 py-1.5 rounded-full border border-neutral-800 bg-black/30 text-neutral-200 text-sm hover:bg-black/50"
                    disabled={loading}
                  >
                    刷新
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-3 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="px-8 pb-8 h-[calc(100%-84px)] overflow-y-auto">
              {active === 'subscription' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-semibold text-white">选择你的套餐</div>
                    <div className="mt-2 text-sm text-neutral-500">不止额度，更是灵感落地的速度。积分永不过期。</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl border border-neutral-800 bg-black/30 p-1">
                      {availableCycles.includes('monthly') && (
                        <button
                          onClick={() => setPlanCycle('monthly')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${planCycle === 'monthly' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                          连续包月
                        </button>
                      )}
                      {availableCycles.includes('yearly') && (
                        <button
                          onClick={() => setPlanCycle('yearly')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${planCycle === 'yearly' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                          连续包年
                          {yearlyDiscountPercent && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/30">省 {yearlyDiscountPercent}%</span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setPlanCycle('enterprise')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${planCycle === 'enterprise' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                      >
                        企业版
                      </button>
                    </div>
                  </div>

                  {planCycle === 'enterprise' ? (
                    <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                      <div className="text-white font-semibold text-lg">企业版</div>
                      <div className="text-sm text-neutral-500 mt-2">需要定制套餐、团队额度或对公开票？请联系管理员或商务支持。</div>
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          '团队席位与权限管理',
                          '更高并发与稳定性保障',
                          '对公开票与合同支持'
                        ].map((x) => (
                          <div key={x} className="rounded-xl border border-neutral-800 bg-white/5 px-4 py-3 text-sm text-neutral-200">
                            {x}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {plansForCycle.map((p, idx) => {
                        const total = plansForCycle.length;
                        const badge = pickBadges(idx, total, p);
                        const isCurrent = subscription?.plan?.name === p.name || subscription?.plan?.code === p.code;
                        const features = Array.isArray(p.features)
                          ? p.features
                          : Object.entries(p.features || {}).map(([k, v]) => `${k}: ${v}`);
                        const safeFeatures = (features || []).slice(0, 4);

                        const cardTone = badge?.tone === 'blue'
                          ? 'border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-black/30'
                          : badge?.tone === 'emerald'
                            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-black/30'
                            : 'border-neutral-800 bg-black/30';

                        return (
                          <div key={p.id} className={`rounded-2xl border p-5 ${cardTone}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm text-neutral-500">{(p.code || '').toUpperCase()}</div>
                                <div className="mt-1 text-xl font-semibold text-white">{p.name}</div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {badge && (
                                  <span className={`text-xs px-2 py-1 rounded-full border ${badge.tone === 'blue' ? 'bg-blue-500/15 text-blue-200 border-blue-500/30' : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'}`}>
                                    {badge.label}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-neutral-200 border border-neutral-800">
                                    当前套餐
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex items-end gap-2">
                              <div className="text-4xl font-bold text-white">¥{formatMoney(p.price)}</div>
                              <div className="text-sm text-neutral-500">{planCycle === 'monthly' ? '/月' : '/年'}</div>
                            </div>
                            {planCycle === 'yearly' && availableCycles.includes('monthly') && (
                              <div className="mt-1 text-xs text-neutral-500">
                                约 ¥{formatMoney((p.price || 0) / 12)}/月
                              </div>
                            )}

                            <div className="mt-4 rounded-xl border border-neutral-800 bg-black/20 px-4 py-3">
                              <div className="text-xs text-neutral-500">每月积分</div>
                              <div className="mt-1 text-lg font-semibold text-white">{(p.monthly_credits || 0).toLocaleString()}</div>
                            </div>

                            {safeFeatures.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {safeFeatures.map((f: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-neutral-200">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/50" />
                                    <span className="min-w-0">{String(f)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              disabled={isCurrent || loading}
                              onClick={() => handleSubscribe(p.code || p.name)}
                              className={`mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isCurrent
                                  ? 'bg-neutral-900 text-neutral-500 cursor-not-allowed'
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {isCurrent ? '已订阅' : '订阅'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {active === 'recharge' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                    <div className="text-white font-semibold text-lg">选择充值额度</div>
                    <div className="text-sm text-neutral-500 mt-1">通过充值获取更多积分，用于图片/视频生成</div>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {rechargeOptions.map((o) => (
                        <button
                          key={o.credits}
                          onClick={() => handlePurchase(o.credits)}
                          disabled={loading}
                          className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-white/5 to-white/0 hover:from-white/10 hover:to-white/0 p-5 text-left transition-colors"
                        >
                          <div className="text-white text-2xl font-bold">{o.credits.toLocaleString()}</div>
                          <div className="text-neutral-400 text-sm mt-1">积分</div>
                          <div className="mt-4 text-neutral-200 text-lg font-semibold">¥{formatMoney(o.price)}</div>
                          <div className="text-xs text-neutral-500 mt-1">自动入账</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {active === 'billing' && (
                <div className="rounded-2xl border border-neutral-800 bg-black/30 overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-3">
                    <div className="text-white font-semibold">账单详情</div>
                    <div className="text-xs text-neutral-500">最近 50 条</div>
                  </div>
                  <div className="grid grid-cols-[220px_220px_1fr_160px] gap-0 px-5 py-3 text-xs text-neutral-500 border-b border-neutral-900">
                    <div>账单ID</div>
                    <div>交易时间</div>
                    <div>消费内容</div>
                    <div className="text-right">积分变动</div>
                  </div>
                  {history.length === 0 && (
                    <div className="px-5 py-10 text-center text-neutral-500">暂无账单记录</div>
                  )}
                  {history.map((tx) => (
                    <div key={tx.id} className="grid grid-cols-[220px_220px_1fr_160px] gap-0 px-5 py-4 border-b border-neutral-900 hover:bg-white/5">
                      <div className="text-neutral-300 text-sm">{tx.id}</div>
                      <div className="text-neutral-500 text-sm">{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</div>
                      <div className="text-neutral-200 text-sm truncate">{tx.description}</div>
                      <div className={`text-right text-sm font-semibold ${tx.credits >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {tx.credits >= 0 ? '+' : ''}{tx.credits}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {active === 'profile' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                    <div className="text-white font-semibold text-lg">资料设置</div>
                    <div className="mt-5 flex gap-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                        <div className="text-white font-semibold text-xl">{(profileUsername || 'U').charAt(0).toUpperCase()}</div>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-neutral-500 mb-1">用户名</div>
                            <div className="text-xs text-neutral-600">{Math.min(profileUsername.length, 30)}/30</div>
                          </div>
                          <input
                            value={profileUsername}
                            maxLength={30}
                            onChange={(e) => setProfileUsername(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-neutral-500 mb-1">个人简介</div>
                            <div className="text-xs text-neutral-600">{Math.min(profileBio.length, 200)}/200</div>
                          </div>
                          <textarea
                            value={profileBio}
                            maxLength={200}
                            onChange={(e) => setProfileBio(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500 resize-none"
                            rows={3}
                            placeholder="介绍一下你自己..."
                          />
                        </div>

                        <div className="text-sm text-neutral-500">
                          {(getCurrentUser() as any)?.email || ''}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading || !profileUsername.trim()}
                          className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          保存
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                    <div className="text-white font-semibold text-lg">语言</div>
                    <div className="mt-4">
                      <select
                        value={uiLanguage}
                        onChange={(e) => {
                          const next = e.target.value === 'en' ? 'en' : 'zh';
                          setUiLanguage(next);
                          setLanguage(next);
                          window.location.reload();
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-200 outline-none focus:border-blue-500"
                      >
                        <option value="zh">简体中文</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                    <div className="text-white font-semibold text-lg">修改密码</div>
                    <div className="text-sm text-neutral-500 mt-1">为了账户安全，请定期更新密码</div>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">当前密码</div>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                          placeholder="输入当前密码"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">新密码</div>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500"
                          placeholder="输入新密码"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={loading || !currentPassword || !newPassword}
                      className="mt-4 px-5 py-2 rounded-lg text-sm font-medium bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      更新密码
                    </button>
                  </div>
                </div>
              )}

              {active === 'tutorial' && (
                <div className="rounded-2xl border border-neutral-800 bg-black/30 p-6">
                  <div className="text-white font-semibold text-lg">使用教程</div>
                  <div className="text-sm text-neutral-500 mt-2">稍后接入官方教程内容入口</div>
                  <button
                    className="mt-5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 border border-neutral-800"
                    onClick={() => window.open('https://open.bsv.vip/', '_blank')}
                  >
                    打开教程
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {loading && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-pulse" />
          </div>
        )}
      </div>

      {payOpen && (
        <div className="absolute inset-0 z-[10001] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPayOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl border border-neutral-800 bg-[#0f0f0f] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <div className="text-white font-semibold">支付</div>
              <button
                className="w-9 h-9 rounded-full border border-neutral-800 bg-black/40 hover:bg-black/60 flex items-center justify-center text-neutral-300 hover:text-white"
                onClick={() => setPayOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPayProvider('alipay')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${payProvider === 'alipay' ? 'bg-white text-black border-white' : 'bg-black/30 text-neutral-300 border-neutral-800 hover:bg-black/50'}`}
                  disabled={payStatus === 'pending' || payStatus === 'creating'}
                >
                  支付宝
                </button>
                <button
                  onClick={() => setPayProvider('wechat')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${payProvider === 'wechat' ? 'bg-white text-black border-white' : 'bg-black/30 text-neutral-300 border-neutral-800 hover:bg-black/50'}`}
                  disabled={payStatus === 'pending' || payStatus === 'creating'}
                >
                  微信支付
                </button>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-neutral-200 font-medium">扫码支付</div>
                  <div className="text-xs text-neutral-500">{payOrderId || ''}</div>
                </div>
                <div className="mt-4 flex items-center justify-center">
                  {payStatus === 'creating' && (
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  {payStatus !== 'creating' && payQr && (
                    <img
                      alt="qr"
                      className="w-[240px] h-[240px] rounded-xl border border-neutral-800 bg-black"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payQr)}`}
                    />
                  )}
                </div>
                <div className="mt-4 text-center text-sm text-neutral-400">
                  {payStatus === 'pending' && '请使用手机扫码完成支付'}
                  {payStatus === 'completed' && '支付成功'}
                  {payStatus === 'failed' && '支付失败'}
                </div>
                {payQr && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      readOnly
                      value={payQr}
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-800 bg-black/40 text-neutral-300 text-xs truncate"
                    />
                    <button
                      className="px-3 py-2 rounded-lg border border-neutral-800 bg-white/10 hover:bg-white/15 text-neutral-200 text-xs"
                      onClick={() => navigator.clipboard.writeText(payQr)}
                    >
                      复制
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
