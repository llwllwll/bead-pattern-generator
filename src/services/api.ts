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

    // 检查是否是管理员API (包括 /admin 和 /palettes 管理)
    const isAdminAPI = config.url?.startsWith('/admin') || config.url?.startsWith('/palettes');
    
    // 登录和注册请求不应该携带 token
    const isAuthAPI = config.url?.startsWith('/auth/login') || config.url?.startsWith('/auth/register') || config.url?.startsWith('/admin/login');
    
    if (isAuthAPI) {
      return config;
    }
    
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
      const isAdminAPI = originalRequest.url?.startsWith('/admin') || originalRequest.url?.startsWith('/palettes');
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
            window.location.href = '/admin';
          } else {
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
    device_type?: string;
  }) => apiClient.post('/auth/register', data),
  
  login: (data: {
    phone: string;
    password: string;
    device_id?: string;
    device_type?: string;
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
  
  getAdminInfo: () => apiClient.get('/admin/me'),
  
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

  deleteUser: (userId: string) => apiClient.delete(`/admin/users/${userId}`),
  
  getStats: () => apiClient.get('/admin/stats'),
  
  listAdmins: () => apiClient.get('/admin/admins'),

  updateAdminPassword: (adminId: string, data: { new_password: string }) => apiClient.put(`/admin/admins/${adminId}/password`, data),

  deleteAdmin: (adminId: string) => apiClient.delete(`/admin/admins/${adminId}`),

  getAdminLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    resource_type?: string;
    admin_id?: string;
  }) => apiClient.get('/admin/logs', { params }),
};

// ============ Brand API ============

export interface Brand {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  series_count: number;
}

export interface BrandCreate {
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface BrandUpdate {
  name?: string;
  code?: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
  display_order?: number;
}

// ============ Series API ============

export interface Series {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  brand_id: string;
  brand_name?: string;
  created_at: string;
  updated_at: string;
  color_count: number;
}

export interface SeriesCreate {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  display_order?: number;
  brand_id: string;
}

export interface SeriesUpdate {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  display_order?: number;
}

// ============ Color API ============

export interface Color {
  id: string;
  color_code: string;
  name?: string;
  hex: string;
  is_transparent: boolean;
  is_glow: boolean;
  is_metallic: boolean;
  display_order: number;
  series_id: string;
  series_name?: string;
  brand_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ColorCreate {
  color_code: string;
  name?: string;
  hex: string;
  is_transparent?: boolean;
  is_glow?: boolean;
  is_metallic?: boolean;
  display_order?: number;
  series_id: string;
}

export interface ColorUpdate {
  color_code?: string;
  name?: string;
  hex?: string;
  is_transparent?: boolean;
  is_glow?: boolean;
  is_metallic?: boolean;
  display_order?: number;
}

// ============ Hierarchical Types ============

export interface HierarchicalBrand {
  id: string;
  name: string;
  code: string;
  description?: string;
  series: HierarchicalSeries[];
}

export interface HierarchicalSeries {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_default: boolean;
  colors: Color[];
}

// ============ Import Types ============

export interface ColorImportRow {
  brand_code: string;
  brand_name: string;
  series_code: string;
  series_name: string;
  color_code: string;
  color_name?: string;
  hex: string;
  is_transparent?: boolean;
  is_glow?: boolean;
  is_metallic?: boolean;
}

export interface ColorImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: string[];
}

// ============ Palette API ============

export const paletteApi = {
  // ========== Brand APIs ==========
  
  // List all brands
  getBrands: () =>
    apiClient.get('/palettes/brands').then((res) => res.data),
  
  // Create brand
  createBrand: (data: BrandCreate) =>
    apiClient.post('/palettes/brands', data).then((res) => res.data),
  
  // Get brand with series
  getBrand: (brandId: string) =>
    apiClient.get(`/palettes/brands/${brandId}`).then((res) => res.data),
  
  // Update brand
  updateBrand: (brandId: string, data: BrandUpdate) =>
    apiClient.put(`/palettes/brands/${brandId}`, data).then((res) => res.data),
  
  // Delete brand
  deleteBrand: (brandId: string) =>
    apiClient.delete(`/palettes/brands/${brandId}`),
  
  // Batch reorder brands
  batchReorderBrands: (orders: { id: string; display_order: number }[]) =>
    apiClient.post('/palettes/brands/batch-reorder', orders).then((res) => res.data),
  
  // Batch delete brands
  batchDeleteBrands: (brandIds: string[]) =>
    apiClient.post('/palettes/brands/batch-delete', brandIds).then((res) => res.data),
  
  // Export brands
  exportBrands: (brandIds?: string[]) =>
    apiClient.post('/palettes/brands/export', brandIds).then((res) => res.data),
  
  // ========== Series APIs ==========
  
  // List all series (optionally filtered by brand)
  getSeries: (brandId?: string) =>
    apiClient.get('/palettes/series', { params: { brand_id: brandId } }).then((res) => res.data),
  
  // Create series
  createSeries: (data: SeriesCreate) =>
    apiClient.post('/palettes/series', data).then((res) => res.data),
  
  // Get series with colors
  getSeriesDetail: (seriesId: string) =>
    apiClient.get(`/palettes/series/${seriesId}`).then((res) => res.data),
  
  // Update series
  updateSeries: (seriesId: string, data: SeriesUpdate) =>
    apiClient.put(`/palettes/series/${seriesId}`, data).then((res) => res.data),
  
  // Delete series
  deleteSeries: (seriesId: string) =>
    apiClient.delete(`/palettes/series/${seriesId}`),
  
  // Batch reorder series
  batchReorderSeries: (orders: { id: string; display_order: number }[]) =>
    apiClient.post('/palettes/series/batch-reorder', orders).then((res) => res.data),
  
  // Batch delete series
  batchDeleteSeries: (seriesIds: string[]) =>
    apiClient.post('/palettes/series/batch-delete', seriesIds).then((res) => res.data),
  
  // Export series
  exportSeries: (seriesIds?: string[]) =>
    apiClient.post('/palettes/series/export', seriesIds).then((res) => res.data),
  
  // ========== Color APIs ==========
  
  // List all colors (optionally filtered by series)
  getColors: (seriesId?: string) =>
    apiClient.get('/palettes/colors', { params: { series_id: seriesId } }).then((res) => res.data),
  
  // Create color
  createColor: (seriesId: string, data: Omit<ColorCreate, 'series_id'>) =>
    apiClient.post(`/palettes/series/${seriesId}/colors`, data).then((res) => res.data),
  
  // Update color
  updateColor: (colorId: string, data: ColorUpdate) =>
    apiClient.put(`/palettes/colors/${colorId}`, data).then((res) => res.data),
  
  // Delete color
  deleteColor: (colorId: string) =>
    apiClient.delete(`/palettes/colors/${colorId}`),
  
  // ========== Import API ==========
  
  // Bulk import (with extended timeout for large datasets)
  importColors: (rows: ColorImportRow[], createBrands?: boolean, createSeries?: boolean) =>
    apiClient.post('/palettes/import', {
      rows,
      create_brands: createBrands ?? true,
      create_series: createSeries ?? true
    }, {
      timeout: 120000 // 120秒超时，用于大批量导入
    }).then((res) => res.data),
  
  // ========== Public APIs (for frontend) ==========
  
  // Get all brands with series count
  getPublicBrands: () =>
    apiClient.get('/palettes/public/brands').then((res) => res.data),
  
  // Get series for a brand
  getPublicSeries: (brandId: string) =>
    apiClient.get(`/palettes/public/brands/${brandId}/series`).then((res) => res.data),
  
  // Get colors for a series
  getPublicSeriesColors: (seriesId: string) =>
    apiClient.get(`/palettes/series/${seriesId}/colors`).then((res) => res.data),
  
  // Get full hierarchy (brand -> series -> color)
  getPublicHierarchy: () =>
    apiClient.get('/palettes/hierarchy').then((res) => res.data),
  
  // ========== Legacy APIs (for backward compatibility) ==========
  
  // Legacy: Get palettes list
  getPublicPalettes: () =>
    apiClient.get('/palettes/public').then((res) => res.data),
  
  // Legacy: Get palette detail
  getPublicPalette: (paletteId: string) =>
    apiClient.get(`/palettes/legacy/${paletteId}`).then((res) => res.data),
};

export default apiClient;
