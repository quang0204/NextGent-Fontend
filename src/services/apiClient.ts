import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Backend context path chuẩn: http://localhost:8080/nextgen/api/v1
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/nextgen/api/v1';

export function getStoredUser(): { userId?: number; fullName?: string; phone?: string; email?: string; role?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('nextpick_user_v2') || localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Quản lý Refresh Token Queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Tự động đính kèm accessToken và log URL gọi thực tế
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // In log chi tiết trong môi trường phát triển (DEV) và ẩn dữ liệu nhạy cảm
    if (import.meta.env.DEV) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      const isAuth = config.url?.includes('/auth/');
      console.log(`[API REQUEST] 🚀 ${config.method?.toUpperCase()} ${fullUrl}`, isAuth ? '[REDACTED_AUTH_DATA]' : (config.data || ''));
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý 401 Silent Refresh Token & In log phản hồi
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const fullUrl = `${response.config.baseURL || ''}${response.config.url || ''}`;
      const isAuth = response.config.url?.includes('/auth/');
      console.log(`[API RESPONSE] ✅ ${response.status} ${fullUrl}`, isAuth ? '[REDACTED_AUTH_DATA]' : response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const fullUrl = originalRequest ? `${originalRequest.baseURL || ''}${originalRequest.url || ''}` : '';
    console.warn(`[API ERROR] ❌ ${error.response?.status || 'NETWORK_ERROR'} ${fullUrl}`, error.response?.data || error.message);

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const requestUrl = originalRequest.url || '';

    // Bỏ qua nếu lỗi 401 xảy ra ở chính endpoint refresh-token hoặc các bước login
    const isAuthEndpoint = 
      requestUrl.includes('/auth/refresh-token') ||
      requestUrl.includes('/auth/login-initiate') ||
      requestUrl.includes('/auth/login-verify-otp');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(error);
      }

      try {
        console.log(`[API REFRESH] 🔄 Đang làm mới Access Token từ ${API_BASE_URL}/auth/refresh-token`);
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh token did not return a valid accessToken');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
