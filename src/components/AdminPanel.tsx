/**
 * 管理员面板
 */
import React, { useState, useEffect } from 'react';
import { getToken } from '../services/authService';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'banned';
  subscription_type: 'free' | 'basic' | 'pro' | 'enterprise';
  balance: number;
  created_at: string;
}

interface Stats {
  users: { total: number; active: number };
  projects: { total: number };
  assets: { total: number };
  tasks: { total: number; today: number };
  credits: { total: number };
}

type TabType = 'users' | 'stats' | 'config';

export function AdminPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // 充值表单
  const [rechargeUserId, setRechargeUserId] = useState<number | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDesc, setRechargeDesc] = useState('');

  const api = async (url: string, options: RequestInit = {}) => {
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
  };

  const loadUsers = async (page = 1) => {
    setLoading(true);
    try {
      const data = await api(`/admin/users?page=${page}&limit=${pagination.limit}`);
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err: any) {
      console.error('加载用户失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api('/admin/stats');
      setStats(data.data);
    } catch (err: any) {
      console.error('加载统计失败:', err);
      alert('加载统计数据失败: ' + (err.message || '请检查是否已登录管理员账号'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadStats();
    }
  }, [isOpen]);

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
      loadUsers();
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
      alert('更新成功');
      loadUsers();
    } catch (err: any) {
      alert(err.message || '更新失败');
    }
  };

  if (!isOpen) return null;

  const subscriptionLabels: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    pro: '专业版',
    enterprise: '企业版'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    banned: 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-12 overflow-auto">
      <div className="bg-[#1a1a2e] rounded-xl w-[1000px] max-w-[95vw] max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">管理后台</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-white/10">
          <div className="flex gap-1">
            {[
              { id: 'users', label: '用户管理' },
              { id: 'stats', label: '运营统计' },
              { id: 'config', label: '系统配置' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'users' && (
            <div>
              {/* Stats Summary */}
              {stats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">总用户</div>
                    <div className="text-2xl font-bold text-white">{stats.users.total}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">活跃用户</div>
                    <div className="text-2xl font-bold text-green-400">{stats.users.active}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">总积分</div>
                    <div className="text-2xl font-bold text-blue-400">{stats.credits.total.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">今日任务</div>
                    <div className="text-2xl font-bold text-purple-400">{stats.tasks.today}</div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white/5 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">用户</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">邮箱</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">角色</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">套餐</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">积分</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{user.username}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{user.email}</td>
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
                            className={`text-xs px-2 py-0.5 rounded border-0 ${statusColors[user.status]}`}
                          >
                            <option value="active">活跃</option>
                            <option value="inactive">未激活</option>
                            <option value="banned">封禁</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {subscriptionLabels[user.subscription_type]}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-medium">{user.balance.toLocaleString()}</span>
                            <button
                              onClick={() => setRechargeUserId(user.id)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              充值
                            </button>
                          </div>
                          
                          {/* Recharge Form */}
                          {rechargeUserId === user.id && (
                            <div className="mt-2 p-2 bg-white/5 rounded">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={rechargeAmount}
                                  onChange={(e) => setRechargeAmount(e.target.value)}
                                  placeholder="积分数量"
                                  className="flex-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-sm text-white"
                                  min="1"
                                />
                                <button
                                  onClick={() => handleRecharge(user.id)}
                                  className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-500"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => { setRechargeUserId(null); setRechargeAmount(''); }}
                                  className="text-gray-400 hover:text-white px-2 py-1"
                                >
                                  取消
                                </button>
                              </div>
                              <input
                                type="text"
                                value={rechargeDesc}
                                onChange={(e) => setRechargeDesc(e.target.value)}
                                placeholder="备注（可选）"
                                className="w-full mt-1 bg-[#0f0f1a] border border-white/10 rounded px-2 py-1 text-sm text-white"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.subscription_type}
                            onChange={(e) => handleUpdateUser(user.id, { subscription_type: e.target.value as any })}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
                          >
                            <option value="free">免费版</option>
                            <option value="basic">基础版</option>
                            <option value="pro">专业版</option>
                            <option value="enterprise">企业版</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-gray-400 text-sm">
                  共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 bg-white/5 rounded text-sm disabled:opacity-50 hover:bg-white/10"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => loadUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 bg-white/5 rounded text-sm disabled:opacity-50 hover:bg-white/10"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            loading && !stats ? (
              <div className="text-center py-12">
                <div className="text-gray-400">加载中...</div>
              </div>
            ) : !stats ? (
              <div className="text-center py-12">
                <div className="text-gray-400">请确保已登录管理员账号</div>
                <button
                  onClick={loadStats}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  重新加载
                </button>
              </div>
            ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">用户统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">总用户数</span>
                      <span className="text-white font-medium">{stats.users.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">活跃用户</span>
                      <span className="text-green-400 font-medium">{stats.users.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">非活跃用户</span>
                      <span className="text-gray-300">{stats.users.total - stats.users.active}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">任务统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">总任务数</span>
                      <span className="text-white font-medium">{stats.tasks.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">今日任务</span>
                      <span className="text-blue-400 font-medium">{stats.tasks.today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">总资产数</span>
                      <span className="text-purple-400 font-medium">{stats.assets.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">总项目数</span>
                      <span className="text-orange-400 font-medium">{stats.projects.total}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-lg font-medium text-white mb-4">积分统计</h3>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-400">{stats.credits.total.toLocaleString()}</div>
                    <div className="text-gray-400 mt-2">平台总积分</div>
                  </div>
                </div>
              </div>
            </div>
            )
          )}

          {activeTab === 'config' && (
            <div className="text-gray-400 text-center py-12">
              系统配置功能开发中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
