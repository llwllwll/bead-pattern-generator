import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    // 检查是否是管理员API
    const isAdminAPI = config.url?.startsWith('/api/admin');
    
    if (isAdminAPI) {
      const adminToken = localStorage.getItem('admin_access_token');
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      const token = localStorage.getItem('access_token');
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
      const isAdminAPI = originalRequest.url?.startsWith('/api/admin');
      const tokenKey = isAdminAPI ? 'admin_refresh_token' : 'refresh_token';
      const accessTokenKey = isAdminAPI ? 'admin_access_token' : 'access_token';
      
      const refreshToken = localStorage.getItem(tokenKey);
      
      if (refreshToken) {
        try {
          // Try to refresh token
          const refreshUrl = isAdminAPI ? '/api/admin/refresh' : '/api/auth/refresh';
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
  }) => apiClient.post('/api/auth/register', data),
  
  login: (data: {
    phone: string;
    password: string;
    device_id?: string;
    fcm_token?: string;
  }) => apiClient.post('/api/auth/login', data),
  
  refresh: (refreshToken: string) =>
    apiClient.post('/api/auth/refresh', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  
  getMe: () => apiClient.get('/api/auth/me'),
  
  changePassword: (data: { old_password: string; new_password: string }) =>
    apiClient.put('/api/auth/password', data),
  
  requestPasswordReset: (email: string) =>
    apiClient.post('/api/auth/password/reset-request', { email }),
  
  confirmPasswordReset: (data: { token: string; new_password: string }) =>
    apiClient.post('/api/auth/password/reset-confirm', data),
};

// Activation API
export const activationAPI = {
  validateCode: (activation_code: string) =>
    apiClient.post('/api/activation/validate', { activation_code }),
  
  applyCode: (activation_code: string) =>
    apiClient.post('/api/activation/apply', { activation_code }),
  
  getHistory: () => apiClient.get('/api/activation/history'),
};

// Credits API
export const creditsAPI = {
  getCredits: () => apiClient.get('/api/user/credits'),
  
  getUsageHistory: (params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) => apiClient.get('/api/user/usage-history', { params }),
};

// Pattern API
export const patternAPI = {
  checkPermission: () => apiClient.get('/api/pattern/check-permission'),
  
  generate: (data: FormData) =>
    apiClient.post('/api/pattern/generate', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  generateJSON: (data: {
    width: number;
    height: number;
    palette?: string;
    options?: Record<string, any>;
  }) => apiClient.post('/api/pattern/generate-json', data),
};

// Admin API
export const adminAPI = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/api/admin/login', data),
  
  createAdmin: (data: {
    username: string;
    email: string;
    password: string;
    role?: string;
    permissions?: Record<string, any>;
  }) => apiClient.post('/api/admin/create', data),
  
  generateActivationCodes: (params: {
    count?: number;
  }, config: {
    code_type: string;
    credits: number;
    validity_days?: number;
    price?: number;
    currency?: string;
    batch_id?: string;
    note?: string;
    expires_at?: string;
  }) => apiClient.post('/api/admin/activation-codes/generate', config, { params }),
  
  listActivationCodes: (params?: {
    page?: number;
    limit?: number;
    batch_id?: string;
    is_used?: boolean;
    code_type?: string;
  }) => apiClient.get('/api/admin/activation-codes', { params }),
  
  listUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }) => apiClient.get('/api/admin/users', { params }),
  
  updateUserCredits: (
    userId: string,
    data: {
      action: 'add' | 'subtract' | 'set';
      amount: number;
      note?: string;
    }
  ) => apiClient.put(`/api/admin/users/${userId}/credits`, data),
  
  getStats: () => apiClient.get('/api/admin/stats'),
};

export default apiClient;