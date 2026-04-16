/**
 * 认证服务
 * 处理用户登录、注册、Token 管理
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Token 存储键
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'banned';
  subscription_type: 'free' | 'basic' | 'pro' | 'enterprise';
  balance: number;
  avatar_url?: string;
  subscription_expires_at?: string;
  last_login_at?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// API 请求函数
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`服务返回非 JSON（请检查前端 API_BASE 或反向代理 /api 配置）。状态码: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || '请求失败');
  }

  return data as T;
}

// Token 管理
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

// 用户管理
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// 认证 API
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (response.success && response.data) {
    setToken(response.data.token);
    setRefreshToken(response.data.refreshToken);
    setCurrentUser(response.data.user);
  }
  
  return response;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (response.success && response.data) {
    setToken(response.data.token);
    setRefreshToken(response.data.refreshToken);
    setCurrentUser(response.data.user);
  }
  
  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (e) {
    // 忽略错误，即使请求失败也要清除本地数据
  }
  removeToken();
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  
  try {
    const response = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    if (response.success && response.data) {
      setToken(response.data.token);
      setRefreshToken(response.data.refreshToken);
      setCurrentUser(response.data.user);
      return true;
    }
  } catch (e) {
    console.error('Refresh token failed:', e);
    removeToken();
  }
  
  return false;
}

export async function getMe(): Promise<User | null> {
  try {
    const response = await apiRequest<{ success: boolean; data: { user: User } }>('/user/me');
    if (response.success && response.data) {
      setCurrentUser(response.data.user);
      return response.data.user;
    }
  } catch (e) {
    console.error('Get user failed:', e);
  }
  return null;
}

export async function updateProfile(data: { username?: string; avatar_url?: string }): Promise<User | null> {
  try {
    const response = await apiRequest<{ success: boolean; data: { user: User } }>('/user/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (response.success && response.data) {
      setCurrentUser(response.data.user);
      return response.data.user;
    }
  } catch (e) {
    console.error('Update profile failed:', e);
  }
  return null;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const response = await apiRequest<{ success: boolean }>('/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response.success;
  } catch (e) {
    console.error('Change password failed:', e);
    return false;
  }
}

// 检查是否已登录
export function isAuthenticated(): boolean {
  return !!getToken();
}

// 检查是否是管理员
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}
