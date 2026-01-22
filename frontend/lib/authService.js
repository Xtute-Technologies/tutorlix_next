import axiosInstance from './axios';
import Cookies from 'js-cookie';

export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/registration/', userData);

    if (response.data.access && response.data.refresh) {
      Cookies.set('accessToken', response.data.access, { expires: 1 });
      Cookies.set('refreshToken', response.data.refresh, { expires: 30 });
    }

    return response.data;
  },

  // Login with email or phone
  login: async (credentials) => {
    const response = await axiosInstance.post('/api/auth/login/', credentials);

    if (response.data.access && response.data.refresh) {
      Cookies.set('accessToken', response.data.access, { expires: 1 });
      Cookies.set('refreshToken', response.data.refresh, { expires: 30 });
    }

    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await axiosInstance.post('/api/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await axiosInstance.get('/api/auth/profile/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await axiosInstance.patch('/api/auth/profile/', profileData);
    return response.data;
  },

  // Verify email
  verifyEmail: async (key) => {
    const response = await axiosInstance.post('/api/auth/registration/verify-email/', { key });
    return response.data;
  },

  // Upload avatar/profile picture
  uploadAvatar: async (formData) => {
    const response = await axiosInstance.patch('/api/auth/profile/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Change password
  changePassword: async (passwords) => {
    const response = await axiosInstance.post('/api/auth/change-password/', passwords);
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await axiosInstance.post('/api/auth/password/reset/', { email });
    return response.data;
  },

  // Confirm password reset
  confirmPasswordReset: async (resetData) => {
    const response = await axiosInstance.post('/api/auth/password/reset/confirm/', resetData);
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!Cookies.get('accessToken');
  },

  // Get all users (admin only) with optional role filter
 getAllUsers: async ({ role = null, page = 1, search = "" } = {}) => {
    const params = { 
      page, 
      search: search || undefined, // Only send if not empty
      ...(role && role !== 'all' && { role }) 
    };
    
    // Returns { count: 120, next: '...', results: [...] }
    const response = await axiosInstance.get('/api/auth/users/', { params });
    return response.data;
  },

  // --- CREATE USER (Supports Image Upload) ---
  createUser: async (userData) => {
    // Check if we need multipart/form-data (for images)
    const isMultipart = userData instanceof FormData;
    const config = isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    
    const response = await axiosInstance.post('/api/auth/users/', userData, config); 
    return response.data;
  },

  // --- UPDATE USER (Supports Image Upload) ---
  updateUser: async (id, userData) => {
    const isMultipart = userData instanceof FormData;
    const config = isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

    const response = await axiosInstance.patch(`/api/auth/users/${id}/`, userData, config);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await axiosInstance.delete(`/api/auth/users/${id}/`);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await axiosInstance.get(`/api/auth/users/${id}/`);
    return response.data;
  },
};
