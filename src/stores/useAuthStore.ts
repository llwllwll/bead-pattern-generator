import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, activationAPI, creditsAPI, adminAPI } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  remaining_credits: number;
  total_used: number;
  activated_at?: string;
  created_at: string;
}

interface AuthState {
  // 用户状态
  isAuthenticated: boolean;
  isActivated: boolean;
  user: User | null;
  trialCount: number;
  maxTrialCount: number;
  accessToken: string | null;
  refreshToken: string | null;

  // 管理员状态
  isAdmin: boolean;
  adminToken: string | null;

  // 登录相关
  login: (phone: string, password: string) => Promise<boolean>;
  register: (data: {
    username: string;
    phone: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => void;
  
  // 管理员登录相关
  adminLogin: (username: string, password: string) => Promise<boolean>;
  adminLogout: () => void;
  
  // 激活相关
  activate: (code: string) => Promise<boolean>;
  
  // 试用相关
  useTrial: () => boolean;
  resetTrialCount: () => void;
  
  // 设置最大试用次数
  setMaxTrialCount: (count: number) => void;
  
  // 获取用户信息
  fetchUserInfo: () => Promise<void>;
  
  // 获取额度信息
  fetchCredits: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      isActivated: false,
      user: null,
      trialCount: 0,
      maxTrialCount: 3,
      accessToken: null,
      refreshToken: null,

      // 管理员初始状态
      isAdmin: false,
      adminToken: null,

      // 登录
      login: async (phone: string, password: string) => {
        try {
          const response = await authAPI.login({
            phone,
            password,
            device_type: 'web'
          });
          
          const { access_token, refresh_token } = response.data;
          
          // 保存token
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          set({
            isAuthenticated: true,
            accessToken: access_token,
            refreshToken: refresh_token
          });
          
          // 获取用户信息
          await get().fetchUserInfo();
          
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      // 注册
      register: async (data) => {
        try {
          await authAPI.register({
            ...data,
            device_type: 'web'
          });
          return true;
        } catch (error) {
          console.error('Registration failed:', error);
          return false;
        }
      },

      // 登出
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          isAuthenticated: false,
          isActivated: false,
          user: null,
          accessToken: null,
          refreshToken: null
        });
      },

      // 管理员登录
      adminLogin: async (username: string, password: string) => {
        try {
          const response = await adminAPI.login({ username, password });
          const { access_token, refresh_token } = response.data;
          
          // 保存管理员token
          localStorage.setItem('admin_access_token', access_token);
          localStorage.setItem('admin_refresh_token', refresh_token);
          
          set({
            isAdmin: true,
            adminToken: access_token
          });
          
          return true;
        } catch (error) {
          console.error('Admin login failed:', error);
          return false;
        }
      },

      // 管理员登出
      adminLogout: () => {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        set({
          isAdmin: false,
          adminToken: null
        });
      },

      // 激活
      activate: async (code: string) => {
        try {
          const response = await activationAPI.applyCode(code);
          
          if (response.data.success) {
            set({ isActivated: true });
            // 刷新用户信息
            await get().fetchUserInfo();
            return true;
          }
          return false;
        } catch (error) {
          console.error('Activation failed:', error);
          return false;
        }
      },

      // 使用试用次数
      useTrial: () => {
        const state = get();
        if (state.trialCount < state.maxTrialCount) {
          set({ trialCount: state.trialCount + 1 });
          return true;
        }
        return false;
      },

      // 重置试用次数
      resetTrialCount: () => {
        set({ trialCount: 0 });
      },

      // 设置最大试用次数
      setMaxTrialCount: (count: number) => {
        set({ maxTrialCount: count });
      },

      // 获取用户信息
      fetchUserInfo: async () => {
        try {
          const response = await authAPI.getMe();
          const user = response.data;
          
          set({
            user,
            isActivated: user.remaining_credits > 0 || !!user.activated_at
          });
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      },

      // 获取额度信息
      fetchCredits: async () => {
        try {
          const response = await creditsAPI.getCredits();
          const { remaining_credits, total_used, last_used_at } = response.data;
          
          set(state => ({
            user: state.user ? {
              ...state.user,
              remaining_credits,
              total_used,
              last_used_at
            } : null
          }));
        } catch (error) {
          console.error('Failed to fetch credits:', error);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isActivated: state.isActivated,
        trialCount: state.trialCount,
        maxTrialCount: state.maxTrialCount,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        adminToken: state.adminToken,
        user: state.user,
        // 不持久化 isAdmin，只持久化 token
        // isAdmin 需要通过 token 有效性来判断
      })
    }
  )
);