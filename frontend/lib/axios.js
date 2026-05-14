import axios from 'axios';
import Cookies from 'js-cookie';

const getDefaultApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (!['localhost', '127.0.0.1'].includes(hostname)) {
      return origin;
    }
  }

  return 'http://127.0.0.1:8000';
};

const normalizeApiBaseUrl = (value) => {
  const rawUrl = (value || getDefaultApiBaseUrl()).trim().replace(/\/+$/, '');

  // Most app API calls already include `/api/...`; avoid generating `/api/api/...`.
  if (rawUrl === '/api') {
    return '';
  }

  if (rawUrl.endsWith('/api')) {
    return rawUrl.slice(0, -4);
  }

  return rawUrl;
};

const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

// ✅ REMOVE forced Content-Type
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor (auth only)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 🚀 DO NOT SET Content-Type manually
    // Let axios decide automatically

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (token refresh)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');

        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/token/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          Cookies.set('accessToken', access, { expires: 1, path: '/' });

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        Cookies.remove('accessToken', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
