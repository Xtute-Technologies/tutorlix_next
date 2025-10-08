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
};
