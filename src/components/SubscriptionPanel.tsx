/**
 * 订阅管理面板组件
 */
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/authService';

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  price: number;
  credits: number;
  billingPeriod: string;
  features: string[];
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
  balanceAfter: number;
  createdAt: string;
}

export const SubscriptionPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'credits' | 'history'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [plansRes, subRes, historyRes] = await Promise.all([
        apiRequest('/api/subscription/plans'),
        apiRequest('/api/subscription/current'),
        apiRequest('/api/subscription/history')
      ]);

      if (plansRes.plans) setPlans(plansRes.plans);
      if (subRes.subscription) setSubscription(subRes.subscription);
      if (historyRes.history) setHistory(historyRes.history);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planName: string) => {
    try {
      await apiRequest('/api/subscription/update', {
        method: 'POST',
        body: { planName }
      });
      alert(`Successfully subscribed to ${planName}!`);
      loadData();
    } catch (error) {
      alert('Failed to subscribe. Please try again.');
    }
  };

  const handlePurchaseCredits = async () => {
    const amount = prompt('Enter amount of credits to purchase:');
    if (!amount) return;
    
    try {
      await apiRequest('/api/subscription/purchase', {
        method: 'POST',
        body: { amount: parseInt(amount) }
      });
      alert(`Successfully purchased ${amount} credits!`);
      loadData();
    } catch (error) {
      alert('Failed to purchase credits. Please try again.');
    }
  };

  const getPlanColor = (name: string) => {
    switch (name) {
      case 'Free': return 'bg-gray-100 border-gray-300';
      case 'Basic': return 'bg-blue-50 border-blue-300';
      case 'Pro': return 'bg-purple-50 border-purple-300';
      case 'Enterprise': return 'bg-amber-50 border-amber-300';
      default: return 'bg-white border-gray-200';
    }
  };

  const getCreditsPercentage = () => {
    if (!subscription) return 0;
    return Math.round((subscription.creditsUsed / subscription.creditsTotal) * 100);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Subscription & Credits</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'plans' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'credits' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Credits
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'history' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-xl p-4 border-2 transition-all ${
                    subscription?.plan.name === plan.name
                      ? 'ring-2 ring-blue-500 ' + getPlanColor(plan.name)
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {subscription?.plan.name === plan.name && (
                    <span className="inline-block px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full mb-2">
                      Current Plan
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-800">{plan.displayName}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">¥{plan.price}</span>
                    <span className="text-gray-500">/{plan.billingPeriod === 'monthly' ? '月' : '年'}</span>
                  </div>
                  <div className="mt-2 text-sm text-blue-600 font-medium">
                    {plan.credits} 积分/月
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={subscription?.plan.name === plan.name}
                    className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
                      subscription?.plan.name === plan.name
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {subscription?.plan.name === plan.name ? 'Current Plan' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'credits' && subscription && (
            <div className="space-y-6">
              {/* 积分概览卡片 */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-medium opacity-90">Current Balance</h3>
                <div className="text-4xl font-bold mt-2">
                  {subscription.creditsRemaining} <span className="text-lg font-normal opacity-80">credits</span>
                </div>
                <p className="text-sm opacity-80 mt-1">
                  {subscription.creditsUsed} used of {subscription.creditsTotal} this month
                </p>
                {/* 进度条 */}
                <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${100 - getCreditsPercentage()}%` }}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePurchaseCredits}
                  className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 transition-colors"
                >
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-medium text-gray-800 dark:text-white">Purchase Credits</div>
                  <div className="text-sm text-gray-500">Add more credits anytime</div>
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 transition-colors"
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-medium text-gray-800 dark:text-white">Upgrade Plan</div>
                  <div className="text-sm text-gray-500">Get more monthly credits</div>
                </button>
              </div>

              {/* 订阅详情 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Current Plan Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Plan:</span>
                    <span className="ml-2 font-medium text-gray-700 dark:text-gray-300">{subscription.plan.displayName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 font-medium ${subscription.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {subscription.isActive ? 'Active' : 'Expired'}
                    </span>
                  </div>
                  {subscription.subscriptionEndDate && (
                    <div>
                      <span className="text-gray-500">Renews:</span>
                      <span className="ml-2 font-medium text-gray-700 dark:text-gray-300">
                        {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transaction history</p>
              ) : (
                history.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'purchase' || tx.type === 'subscription'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.type === 'purchase' ? '+' : tx.type === 'subscription' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{tx.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      tx.credits > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.credits > 0 ? '+' : ''}{tx.credits}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPanel;
