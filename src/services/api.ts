import axios, { AxiosInstance, AxiosError } from 'axios';

// 使用相对路径，通过 Vite 代理发送请求
const API_BASE_URL = '/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const safeParseJson = <T,>(raw: string | null): T | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    };

    const getPersistedAuthState = (): { accessToken?: string | null; adminToken?: string | null } | null => {
      // zustand persist default shape: { state: {...}, version: number }
      const persisted = safeParseJson<{ state?: any }>(localStorage.getItem('auth-storage'));
      if (!persisted?.state) return null;
      return {
        accessToken: persisted.state.accessToken,
        adminToken: persisted.state.adminToken
      };
    };

    // 检查是否是管理员API
    const isAdminAPI = config.url?.startsWith('/admin');
    
    if (isAdminAPI) {
      const adminToken =
        localStorage.getItem('admin_access_token') ||
        getPersistedAuthState()?.adminToken ||
        null;
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      const token =
        localStorage.getItem('access_token') ||
        getPersistedAuthState()?.accessToken ||
        null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle 401 errors - token expired
    if (error.response?.status === 401 && originalRequest) {
      const isAdminAPI = originalRequest.url?.startsWith('/admin');
      const tokenKey = isAdminAPI ? 'admin_refresh_token' : 'refresh_token';
      const accessTokenKey = isAdminAPI ? 'admin_access_token' : 'access_token';
      
      const refreshToken = localStorage.getItem(tokenKey);
      
      if (refreshToken) {
        try {
          // Try to refresh token
          const refreshUrl = isAdminAPI ? '/admin/refresh' : '/auth/refresh';
          const response = await axios.post(`${API_BASE_URL}${refreshUrl}`, {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem(accessTokenKey, access_token);
          localStorage.setItem(tokenKey, refresh_token);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem(accessTokenKey);
          localStorage.removeItem(tokenKey);
          
          if (isAdminAPI) {
            // 管理员登录失败，跳转到管理登录页
            window.location.href = '/admin';
          } else {
            // 用户登录失败，跳转到用户登录页
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, clear and redirect
        localStorage.removeItem(accessTokenKey);
        localStorage.removeItem(tokenKey);
        
        if (isAdminAPI) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    username: string;
    phone: string;
    password: string;
  }) => apiClient.post('/auth/register', data),
  
  login: (data: {
    phone: string;
    password: string;
    device_id?: string;
    fcm_token?: string;
  }) => apiClient.post('/auth/login', data),
  
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  
  getMe: () => apiClient.get('/auth/me'),
  
  changePassword: (data: { old_password: string; new_password: string }) =>
    apiClient.put('/auth/password', data),
  
  requestPasswordReset: (email: string) =>
    apiClient.post('/auth/password/reset-request', { email }),
  
  confirmPasswordReset: (data: { token: string; new_password: string }) =>
    apiClient.post('/auth/password/reset-confirm', data),
};

// Activation API
export const activationAPI = {
  validateCode: (activation_code: string) =>
    apiClient.post('/activation/validate', { activation_code }),
  
  applyCode: (activation_code: string) =>
    apiClient.post('/activation/apply', { activation_code }),
  
  getHistory: () => apiClient.get('/activation/history'),
};

// Credits API
export const creditsAPI = {
  getCredits: () => apiClient.get('/user/credits'),
  
  getUsageHistory: (params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) => apiClient.get('/user/usage-history', { params }),
};

// Pattern API
export const patternAPI = {
  checkPermission: () => apiClient.get('/pattern/check-permission'),
  
  deductCredits: () => apiClient.post('/pattern/deduct-credits'),
  
  generate: (data: FormData) =>
    apiClient.post('/pattern/generate', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  generateJSON: (data: {
    width: number;
    height: number;
    palette?: string;
    options?: Record<string, any>;
  }) => apiClient.post('/pattern/generate-json', data),
};

// Admin API
export const adminAPI = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/admin/login', data),
  
  createAdmin: (data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    permissions?: Record<string, any>;
  }) => apiClient.post('/admin/create', data),
  
  generateActivationCodes: (data: {
    count: number;
    code_type: string;
    credits: number;
    validity_days?: number;
    price?: number;
    currency?: string;
    batch_id?: string;
    note?: string;
    expires_at?: string;
  }) => apiClient.post('/admin/activation-codes/generate', data),
  
  listActivationCodes: (params?: {
    page?: number;
    limit?: number;
    batch_id?: string;
    is_used?: boolean;
    code_type?: string;
  }) => apiClient.get('/admin/activation-codes', { params }),
  
  listUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }) => apiClient.get('/admin/users', { params }),

  createUser: (data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
  }) => apiClient.post('/admin/users', data),

  updateUserCredits: (
    userId: string,
    data: {
      action: 'add' | 'subtract' | 'set';
      amount: number;
      note?: string;
    }
  ) => apiClient.put(`/admin/users/${userId}/credits`, data),
  
  resetUserPassword: (userId: string) => apiClient.post(`/admin/users/${userId}/reset-password`),
  
  updateUser: (userId: string, data: {
    username?: string;
    email?: string;
    phone?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }) => apiClient.put(`/admin/users/${userId}`, data),
  
  getStats: () => apiClient.get('/admin/stats'),
  
  listAdmins: () => apiClient.get('/admin/admins'),

  getAdminLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    resource_type?: string;
    admin_id?: string;
  }) => apiClient.get('/admin/logs', { params }),
};

// Palette API
export const paletteApi = {
  // Public APIs (for frontend)
  getPublicPalettes: () =>
    apiClient.get('/admin/palettes/public').then((res) => res.data),

  getPublicPalette: (paletteId: string) =>
    apiClient.get(`/admin/palettes/public/${paletteId}`).then((res) => res.data),

  // Admin APIs
  getPalettes: () =>
    apiClient.get('/admin/palettes').then((res) => res.data),

  getPalette: (paletteId: string) =>
    apiClient.get(`/admin/palettes/${paletteId}`).then((res) => res.data),

  createPalette: (data: {
    name: string;
    code: string;
    description?: string;
    brand?: string;
    is_default?: boolean;
    colors: Array<{
      color_code: string;
      name?: string;
      hex: string;
      is_transparent?: boolean;
      is_glow?: boolean;
      is_metallic?: boolean;
      display_order?: number;
    }>;
  }) => apiClient.post('/admin/palettes', data).then((res) => res.data),

  updatePalette: (
    paletteId: string,
    data: {
      name?: string;
      description?: string;
      brand?: string;
      is_active?: boolean;
      is_default?: boolean;
    }
  ) => apiClient.put(`/admin/palettes/${paletteId}`, data).then((res) => res.data),

  deletePalette: (paletteId: string) =>
    apiClient.delete(`/admin/palettes/${paletteId}`),

  // Color management
  addColor: (
    paletteId: string,
    data: {
      color_code: string;
      name?: string;
      hex: string;
      is_transparent?: boolean;
      is_glow?: boolean;
      is_metallic?: boolean;
      display_order?: number;
    }
  ) => apiClient.post(`/admin/palettes/${paletteId}/colors`, data).then((res) => res.data),

  updateColor: (
    paletteId: string,
    colorId: string,
    data: {
      color_code: string;
      name?: string;
      hex: string;
      is_transparent?: boolean;
      is_glow?: boolean;
      is_metallic?: boolean;
      display_order?: number;
    }
  ) => apiClient.put(`/admin/palettes/${paletteId}/colors/${colorId}`, data).then((res) => res.data),

  deleteColor: (paletteId: string, colorId: string) =>
    apiClient.delete(`/admin/palettes/${paletteId}/colors/${colorId}`),
};

export default apiClient;