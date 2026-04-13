/**
 * 管理员后台页面（全屏模式）
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getToken, logout } from '../services/authService';
import { X, Users, BarChart3, Settings, CreditCard, ChevronLeft, ChevronRight, Search, RefreshCw, Save, Trash2, Plus, Eye, EyeOff, Globe, Zap, FileText, Film } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'banned';
  subscription_type: 'free' | 'basic' | 'pro' | 'enterprise';
  balance: number;
  created_at: string;
  last_login_at?: string;
}

interface AIModel {
  id: number;
  model_id: string;
  name: string;
  provider: string;
  category: string;
  description?: string;
  api_key?: string;
  api_url?: string;
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
  pricing?: ModelPricing;
}

interface ModelPricing {
  id: number;
  model_id: string;
  billing_type: 'per_call' | 'per_token' | 'per_second';
  price: number;
  price_input?: number;
  price_output?: number;
  unit: string;
  min_charge: number;
  is_active: boolean;
  description?: string;
}

interface PaymentLog {
  id: number;
  order_id: string;
  user_id: number;
  type: string;
  amount: number;
  credits?: number;
  model_id?: string;
  status: string;
  payment_method?: string;
  created_at: string;
  user?: { id: number; username: string; email: string };
}

interface Stats {
  users: { total: number; active: number };
  projects: { total: number };
  assets: { total: number };
  tasks: { total: number; today: number };
  credits: { total: number };
  payments?: { totalPayments: number; todayPayments: number; totalAmount: number; todayAmount: number };
}

type TabType = 'users' | 'stats' | 'models' | 'pricing' | 'payments';

const providerLabels: Record<string, string> = {
  google: 'Google',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  kling: 'Kling',
  minimax: 'MiniMax',
  volcano: 'Volcano',
  custom: '自定义'
};

const categoryLabels: Record<string, string> = {
  image: '图片生成',
  video: '视频生成',
  audio: '音频生成',
  text: '文本生成'
};

const billingTypeLabels: Record<string, string> = {
  per_call: '按次计费',
  per_token: '按Token计费',
  per_second: '按秒计费'
};

export function AdminPage({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');

  // 充值表单
  const [rechargeUserId, setRechargeUserId] = useState<number | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDesc, setRechargeDesc] = useState('');

  // 模型表单
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [modelForm, setModelForm] = useState({
    model_id: '',
    name: '',
    provider: 'google',
    category: 'image',
    description: '',
    api_key: '',
    api_url: '',
    is_enabled: true,
    is_default: false
  });

  // 定价表单
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [editingPricingModel, setEditingPricingModel] = useState<AIModel | null>(null);
  const [pricingForm, setPricingForm] = useState({
    billing_type: 'per_call' as 'per_call' | 'per_token' | 'per_second',
    price: 10,
    price_input: 0,
    price_output: 0,
    unit: '次',
    min_charge: 1,
    description: ''
  });

  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const response = await fetch(`/api${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '请求失败');
    return data;
  }, []);

  const loadUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const url = `/admin/users?page=${page}&limit=${pagination.limit}${searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : ''}`;
      const data = await api(url);
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err: any) {
      console.error('加载用户失败:', err);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.limit, searchKeyword]);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/models/models');
      setModels(data.data.models);
    } catch (err: any) {
      console.error('加载模型失败:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api(`/models/payments?page=${page}&limit=${pagination.limit}`);
      setPayments(data.data.payments);
      setPagination(data.data.pagination);
    } catch (err: any) {
      console.error('加载支付日志失败:', err);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.limit]);

  const loadStats = useCallback(async () => {
    try {
      const [statsData, paymentsStats] = await Promise.all([
        api('/admin/stats'),
        api('/models/payments/stats')
      ]);
      setStats({ ...statsData.data, payments: paymentsStats.data });
    } catch (err: any) {
      console.error('加载统计失败:', err);
    }
  }, [api]);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers(pagination.page);
    else if (activeTab === 'models') loadModels();
    else if (activeTab === 'payments') loadPayments(pagination.page);
    else if (activeTab === 'stats') loadStats();
  }, [activeTab]);

  const handleRecharge = async (userId: number) => {
    if (!rechargeAmount || parseInt(rechargeAmount) <= 0) {
      alert('请输入有效的充值积分数量');
      return;
    }
    try {
      await api(`/admin/users/${userId}/credits`, {
        method: 'POST',
        body: JSON.stringify({
          credits: parseInt(rechargeAmount),
          description: rechargeDesc || '后台充值'
        }),
      });
      alert('充值成功');
      setRechargeUserId(null);
      setRechargeAmount('');
      setRechargeDesc('');
      loadUsers(pagination.page);
      loadStats();
    } catch (err: any) {
      alert(err.message || '充值失败');
    }
  };

  const handleUpdateUser = async (userId: number, updates: Partial<User>) => {
    try {
      await api(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      loadUsers(pagination.page);
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  const handleSaveModel = async () => {
    try {
      if (editingModel) {
        await api(`/models/models/${editingModel.id}`, {
          method: 'PUT',
          body: JSON.stringify(modelForm),
        });
        alert('模型更新成功');
      } else {
        await api('/models/models', {
          method: 'POST',
          body: JSON.stringify(modelForm),
        });
        alert('模型创建成功');
      }
      setShowModelForm(false);
      setEditingModel(null);
      setModelForm({
        model_id: '', name: '', provider: 'google', category: 'image',
        description: '', api_key: '', api_url: '', is_enabled: true, is_default: false
      });
      loadModels();
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  const handleDeleteModel = async (model: AIModel) => {
    if (!confirm(`确定删除模型 "${model.name}" 吗？`)) return;
    try {
      await api(`/models/models/${model.id}`, { method: 'DELETE' });
      alert('模型已删除');
      loadModels();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const handleSavePricing = async () => {
    if (!editingPricingModel) return;
    try {
      await api(`/models/models/${editingPricingModel.model_id}/pricing`, {
        method: 'POST',
        body: JSON.stringify(pricingForm),
      });
      alert('定价设置成功');
      setShowPricingForm(false);
      setEditingPricingModel(null);
      loadModels();
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  const openPricingForm = (model: AIModel) => {
    setEditingPricingModel(model);
    if (model.pricing) {
      setPricingForm({
        billing_type: model.pricing.billing_type,
        price: model.pricing.price,
        price_input: model.pricing.price_input || 0,
        price_output: model.pricing.price_output || 0,
        unit: model.pricing.unit,
        min_charge: model.pricing.min_charge,
        description: model.pricing.description || ''
      });
    } else {
      setPricingForm({
        billing_type: 'per_call',
        price: 10,
        price_input: 0,
        price_output: 0,
        unit: '次',
        min_charge: 1,
        description: ''
      });
    }
    setShowPricingForm(true);
  };

  const subscriptionLabels: Record<string, string> = {
    free: '免费版', basic: '基础版', pro: '专业版', enterprise: '企业版'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    banned: 'bg-red-500/20 text-red-400'
  };

  const paymentTypeLabels: Record<string, string> = {
    credit_purchase: '积分购买',
    subscription: '订阅支付',
    model_generation: '模型生成',
    refund: '退款',
    bonus: '赠送/奖励',
    admin_adjustment: '后台调整'
  };

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    refunded: 'bg-blue-500/20 text-blue-400'
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <h1 className="text-lg font-semibold text-white">管理后台</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadUsers(); loadStats(); loadModels(); loadPayments(); }}
            className="text-sm text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-neutral-900/50 border-r border-neutral-800 py-4">
          <nav className="space-y-1 px-2">
            {[
              { id: 'users', label: '用户管理', icon: Users },
              { id: 'stats', label: '运营统计', icon: BarChart3 },
              { id: 'models', label: 'AI模型配置', icon: Zap },
              { id: 'pricing', label: '模型定价', icon: CreditCard },
              { id: 'payments', label: '支付日志', icon: FileText }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers(1)}
                    placeholder="搜索用户名或邮箱..."
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => loadUsers(1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
                >
                  搜索
                </button>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-neutral-800/50 rounded-lg p-4">
                    <div className="text-neutral-400 text-sm">总用户</div>
                    <div className="text-2xl font-bold text-white">{stats.users.total}</div>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-4">
                    <div className="text-neutral-400 text-sm">活跃用户</div>
                    <div className="text-2xl font-bold text-green-400">{stats.users.active}</div>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-4">
                    <div className="text-neutral-400 text-sm">总积分</div>
                    <div className="text-2xl font-bold text-blue-400">{stats.credits.total.toLocaleString()}</div>
                  </div>
                  <div className="bg-neutral-800/50 rounded-lg p-4">
                    <div className="text-neutral-400 text-sm">今日任务</div>
                    <div className="text-2xl font-bold text-purple-400">{stats.tasks.today}</div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-neutral-800/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">用户</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">邮箱</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">角色</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">套餐</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">积分</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-700/30">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-xs text-neutral-500">
                            注册: {new Date(user.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-sm">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.role === 'admin' ? '管理员' : '用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.status}
                            onChange={(e) => handleUpdateUser(user.id, { status: e.target.value as any })}
                            className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${statusColors[user.status]}`}
                          >
                            <option value="active">活跃</option>
                            <option value="inactive">未激活</option>
                            <option value="banned">封禁</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.subscription_type}
                            onChange={(e) => handleUpdateUser(user.id, { subscription_type: e.target.value as any })}
                            className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-sm text-white cursor-pointer"
                          >
                            {Object.entries(subscriptionLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-medium">{user.balance.toLocaleString()}</span>
                            <button
                              onClick={() => setRechargeUserId(user.id)}
                              className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              充值
                            </button>
                          </div>
                          {rechargeUserId === user.id && (
                            <div className="mt-2 p-2 bg-neutral-900 rounded text-xs">
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="number"
                                  value={rechargeAmount}
                                  onChange={(e) => setRechargeAmount(e.target.value)}
                                  placeholder="积分数量"
                                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
                                  min="1"
                                />
                                <button
                                  onClick={() => handleRecharge(user.id)}
                                  className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => { setRechargeUserId(null); setRechargeAmount(''); }}
                                  className="text-neutral-400 hover:text-white px-2 py-1"
                                >
                                  取消
                                </button>
                              </div>
                              <input
                                type="text"
                                value={rechargeDesc}
                                onChange={(e) => setRechargeDesc(e.target.value)}
                                placeholder="备注（可选）"
                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-400">
                  共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 bg-neutral-800 rounded text-sm disabled:opacity-50 hover:bg-neutral-700 flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> 上一页
                  </button>
                  <button
                    onClick={() => loadUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 bg-neutral-800 rounded text-sm disabled:opacity-50 hover:bg-neutral-700 flex items-center gap-1"
                  >
                    下一页 <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-neutral-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Users size={20} /> 用户统计
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">总用户数</span>
                      <span className="text-white font-medium">{stats.users.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">活跃用户</span>
                      <span className="text-green-400 font-medium">{stats.users.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">非活跃用户</span>
                      <span className="text-neutral-300">{stats.users.total - stats.users.active}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={20} /> 任务统计
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">总任务数</span>
                      <span className="text-white font-medium">{stats.tasks.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">今日任务</span>
                      <span className="text-blue-400 font-medium">{stats.tasks.today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">总项目数</span>
                      <span className="text-orange-400 font-medium">{stats.projects.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">总资产数</span>
                      <span className="text-purple-400 font-medium">{stats.assets.total}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-neutral-800/50 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400">{stats.credits.total.toLocaleString()}</div>
                  <div className="text-neutral-400 mt-2">平台总积分</div>
                </div>
                {stats.payments && (
                  <>
                    <div className="bg-neutral-800/50 rounded-xl p-6 text-center">
                      <div className="text-3xl font-bold text-green-400">{stats.payments.todayPayments}</div>
                      <div className="text-neutral-400 mt-2">今日支付笔数</div>
                    </div>
                    <div className="bg-neutral-800/50 rounded-xl p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-400">¥{stats.payments.todayAmount.toFixed(2)}</div>
                      <div className="text-neutral-400 mt-2">今日支付金额</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">AI模型配置</h2>
                <button
                  onClick={() => {
                    setEditingModel(null);
                    setModelForm({
                      model_id: '', name: '', provider: 'google', category: 'image',
                      description: '', api_key: '', api_url: '', is_enabled: true, is_default: false
                    });
                    setShowModelForm(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2"
                >
                  <Plus size={16} /> 添加模型
                </button>
              </div>

              {/* Models Grid */}
              <div className="grid grid-cols-2 gap-4">
                {models.map((model) => (
                  <div key={model.id} className="bg-neutral-800/50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{model.name}</h3>
                          {model.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">默认</span>
                          )}
                          {!model.is_enabled && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">已禁用</span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{model.model_id}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPricingForm(model)}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-neutral-700"
                          title="设置定价"
                        >
                          <CreditCard size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingModel(model);
                            setModelForm({
                              model_id: model.model_id,
                              name: model.name,
                              provider: model.provider,
                              category: model.category,
                              description: model.description || '',
                              api_key: model.api_key || '',
                              api_url: model.api_url || '',
                              is_enabled: model.is_enabled,
                              is_default: model.is_default
                            });
                            setShowModelForm(true);
                          }}
                          className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-700"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-neutral-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span className="px-2 py-0.5 rounded bg-neutral-700">{providerLabels[model.provider]}</span>
                      <span className="px-2 py-0.5 rounded bg-neutral-700">{categoryLabels[model.category]}</span>
                    </div>
                    {model.pricing && (
                      <div className="mt-3 pt-3 border-t border-neutral-700 flex items-center justify-between text-xs">
                        <span className="text-neutral-400">
                          {billingTypeLabels[model.pricing.billing_type]}：{model.pricing.price}积分/{model.pricing.unit}
                        </span>
                        {model.pricing.is_active ? (
                          <span className="text-green-400">已启用</span>
                        ) : (
                          <span className="text-red-400">已停用</span>
                        )}
                      </div>
                    )}
                    {!model.pricing && (
                      <div className="mt-3 pt-3 border-t border-neutral-700">
                        <button
                          onClick={() => openPricingForm(model)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          + 设置定价
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {models.length === 0 && !loading && (
                <div className="text-center py-12 text-neutral-400">
                  暂无配置模型，点击"添加模型"开始配置
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">模型定价设置</h2>
              <div className="bg-neutral-800/50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">模型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">计费方式</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">单价</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">最低收费</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {models.filter(m => m.is_enabled).map((model) => (
                      <tr key={model.id} className="hover:bg-neutral-700/30">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{model.name}</div>
                          <div className="text-xs text-neutral-500">{model.model_id}</div>
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {model.pricing ? billingTypeLabels[model.pricing.billing_type] : '未设置'}
                        </td>
                        <td className="px-4 py-3">
                          {model.pricing ? (
                            <span className="text-blue-400 font-medium">
                              {model.pricing.price}积分/{model.pricing.unit}
                            </span>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {model.pricing?.min_charge || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {model.pricing?.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">启用</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">停用</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openPricingForm(model)}
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            {model.pricing ? '修改' : '设置'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">支付日志</h2>
              <div className="bg-neutral-800/50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">订单号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">用户</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">类型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">金额</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">积分</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-neutral-700/30">
                        <td className="px-4 py-3 text-neutral-400 text-xs font-mono">{payment.order_id}</td>
                        <td className="px-4 py-3">
                          <div className="text-white">{payment.user?.username || payment.user_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-neutral-700 text-neutral-300">
                            {paymentTypeLabels[payment.type] || payment.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-yellow-400">
                          {payment.amount > 0 ? `¥${Number(payment.amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-blue-400">
                          {payment.credits ? `${payment.credits}积分` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${paymentStatusColors[payment.status]}`}>
                            {payment.status === 'completed' ? '已完成' : payment.status === 'pending' ? '处理中' : payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs">
                          {new Date(payment.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-400">
                  共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPayments(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 bg-neutral-800 rounded text-sm disabled:opacity-50 hover:bg-neutral-700 flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> 上一页
                  </button>
                  <button
                    onClick={() => loadPayments(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 bg-neutral-800 rounded text-sm disabled:opacity-50 hover:bg-neutral-700 flex items-center gap-1"
                  >
                    下一页 <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Model Form Modal */}
      {showModelForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-xl w-[500px] max-w-[90vw] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">{editingModel ? '编辑模型' : '添加模型'}</h3>
              <button onClick={() => setShowModelForm(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">模型ID *</label>
                <input
                  type="text"
                  value={modelForm.model_id}
                  onChange={(e) => setModelForm({ ...modelForm, model_id: e.target.value })}
                  disabled={!!editingModel}
                  placeholder="如: gemini-2.5-flash-image"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">显示名称 *</label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  placeholder="如: Gemini 2.5 闪图"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">提供商</label>
                  <select
                    value={modelForm.provider}
                    onChange={(e) => setModelForm({ ...modelForm, provider: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(providerLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">类别</label>
                  <select
                    value={modelForm.category}
                    onChange={(e) => setModelForm({ ...modelForm, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">描述</label>
                <textarea
                  value={modelForm.description}
                  onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                  placeholder="模型描述（可选）"
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">API URL（可选）</label>
                <input
                  type="text"
                  value={modelForm.api_url}
                  onChange={(e) => setModelForm({ ...modelForm, api_url: e.target.value })}
                  placeholder="自定义API地址，如留空使用默认值"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelForm.is_enabled}
                    onChange={(e) => setModelForm({ ...modelForm, is_enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-neutral-300">启用此模型</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelForm.is_default}
                    onChange={(e) => setModelForm({ ...modelForm, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-neutral-300">设为默认模型</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModelForm(false)}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg text-sm hover:bg-neutral-600"
              >
                取消
              </button>
              <button
                onClick={handleSaveModel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2"
              >
                <Save size={16} /> 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Form Modal */}
      {showPricingForm && editingPricingModel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-xl w-[450px] max-w-[90vw] shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">设置定价 - {editingPricingModel.name}</h3>
              <button onClick={() => setShowPricingForm(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">计费方式 *</label>
                <select
                  value={pricingForm.billing_type}
                  onChange={(e) => setPricingForm({ ...pricingForm, billing_type: e.target.value as any })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(billingTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">单价（积分）*</label>
                <input
                  type="number"
                  value={pricingForm.price}
                  onChange={(e) => setPricingForm({ ...pricingForm, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              {pricingForm.billing_type === 'per_token' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">输入Token单价</label>
                    <input
                      type="number"
                      value={pricingForm.price_input}
                      onChange={(e) => setPricingForm({ ...pricingForm, price_input: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.000001"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">输出Token单价</label>
                    <input
                      type="number"
                      value={pricingForm.price_output}
                      onChange={(e) => setPricingForm({ ...pricingForm, price_output: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.000001"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">计费单位</label>
                  <input
                    type="text"
                    value={pricingForm.unit}
                    onChange={(e) => setPricingForm({ ...pricingForm, unit: e.target.value })}
                    placeholder="如: 次、张、秒"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">最低收费（积分）</label>
                  <input
                    type="number"
                    value={pricingForm.min_charge}
                    onChange={(e) => setPricingForm({ ...pricingForm, min_charge: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">备注</label>
                <input
                  type="text"
                  value={pricingForm.description}
                  onChange={(e) => setPricingForm({ ...pricingForm, description: e.target.value })}
                  placeholder="如: 首充优惠5折"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-700 flex justify-end gap-3">
              <button
                onClick={() => setShowPricingForm(false)}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg text-sm hover:bg-neutral-600"
              >
                取消
              </button>
              <button
                onClick={handleSavePricing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2"
              >
                <Save size={16} /> 保存定价
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
