import axiosInstance from './axios';
import axios from 'axios';

// Helper function to extract results from paginated response
const extractResults = (response) => {
  if (response.results) {
    return {
      results: response.results,
      count: response.count,
      next: response.next,
      previous: response.previous
    };
  }
  return { results: response, count: response.length };
};

// ============= Note APIs =============

export const noteAPI = {
  // Get all notes (with filters)
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/', { params });
    return extractResults(response.data);
  },

  // Alias for teachers/students fetching their own notes - backend handles filtering based on role
  getMyNotes: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/', { params });
    return extractResults(response.data);
  },

  // Get note by ID or slug
  getById: async (idOrSlug) => {
    const response = await axiosInstance.get(`/api/notes/${idOrSlug}/`);
    return response.data;
  },

  // Get public note details (bypasses auth filters for listing)
  getPublicDetail: async (id) => {
    const response = await axiosInstance.get(`/api/notes/${id}/public_detail/`);
    return response.data;
  },

  // Enroll in free note
  enroll: async (id) => {
    const response = await axiosInstance.post(`/api/notes/${id}/enroll/`);
    return response.data;
  },

  // Create new note
  create: async (data) => {
    const response = await axiosInstance.post('/api/notes/', data);
    return response.data;
  },

  // Update note
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/notes/${id}/`, data);
    return response.data;
  },

  // Delete note
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/notes/${id}/`);
    return response.data;
  },

  // Get public notes (no auth required)
  getPublic: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/public/', { params });
    return extractResults(response.data);
  },

  // Get my notes (teacher/admin)
  // getMyNotesTeacher: async (params = {}) => {
  //   const response = await axiosInstance.get('/api/notes/my-notes/', { params });
  //   return extractResults(response.data);
  // },

  // Get accessible notes (student)
  getAccessible: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/accessible/', { params });
    return extractResults(response.data);
  },

  // Toggle note active status
  toggleActive: async (id) => {
    const response = await axiosInstance.post(`/api/notes/${id}/toggle-active/`);
    return response.data;
  },

  // Publish draft note
  publish: async (id) => {
    const response = await axiosInstance.post(`/api/notes/${id}/publish/`);
    return response.data;
  },
  
  // Auto-save note (partial update)
  autoSave: async (id, data) => {
    const response = await axiosInstance.patch(`/api/notes/${id}/`, data);
    return response.data;
  },

  // Get Analytics
  getAnalytics: async () => {
    const response = await axiosInstance.get('/api/notes/analytics/');
    return response.data;
  },
};


// ============= Note Attachment APIs =============

export const noteAttachmentAPI = {
  // Upload attachment to note
  upload: async (noteId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('note', noteId); // Backend expects 'note' ID
    formData.append('file', file);
    
    // Simple file type detection
    const isPdf = file.type === 'application/pdf';
    formData.append('file_type', isPdf ? 'pdf' : 'image');
    formData.append('file_name', file.name);

    const response = await axiosInstance.post(
      '/api/notes/attachments/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );
    return response.data;
  },

  // Delete attachment
  delete: async (attachmentId) => {
    const response = await axiosInstance.delete(
      `/api/notes/attachments/${attachmentId}/`
    );
    return response.data;
  },

  // Rename attachment
  rename: async (attachmentId, newName) => {
    const response = await axiosInstance.patch(
      `/api/notes/attachments/${attachmentId}/`,
      { file_name: newName }
    );
    return response.data;
  },

  // Get all attachments for a note
  getAll: async (noteId) => {
    const response = await axiosInstance.get(`/api/notes/attachments/?note=${noteId}`);
    return extractResults(response.data);
  },
};

// ============= Note Purchase APIs =============

export const notePurchaseAPI = {
  // Get all purchases (admin/teacher)
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/purchases/', { params });
    return extractResults(response.data);
  },

  // Get purchase by ID
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/notes/purchases/${id}/`);
    return response.data;
  },

  // Create purchase (initiate payment)
  create: async (data) => {
    const response = await axiosInstance.post('/api/notes/purchases/initiate_purchase/', data);
    return response.data;
  },

  // Verify payment
  verifyPayment: async (purchaseId, paymentData) => {
    const response = await axiosInstance.post(
      `/api/notes/purchases/${purchaseId}/verify-payment/`,
      paymentData
    );
    return response.data;
  },

  // Get my purchases (student)
  getMyPurchases: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/purchases/my-purchases/', { params });
    return extractResults(response.data);
  },

  // Get purchase statistics
  getStatistics: async () => {
    const response = await axiosInstance.get('/api/notes/purchases/statistics/');
    return response.data;
  },

  // Cancel purchase
  cancel: async (id) => {
    const response = await axiosInstance.post(`/api/notes/purchases/${id}/cancel/`);
    return response.data;
  },
};

// ============= Note Access APIs =============

export const noteAccessAPI = {
  // Get all access records
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/access/', { params });
    return extractResults(response.data);
  },

  // Grant manual access to student
  grant: async (data) => {
    const response = await axiosInstance.post('/api/notes/access/', data);
    return response.data;
  },

  // Update access record
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/notes/access/${id}/`, data);
    return response.data;
  },

  // Revoke access
  revoke: async (id) => {
    const response = await axiosInstance.delete(`/api/notes/access/${id}/`);
    return response.data;
  },

  // Check user's access to a note
  checkAccess: async (noteId) => {
    const response = await axiosInstance.get(`/api/notes/${noteId}/check-access/`);
    return response.data;
  },

  // Get my access records (student)
  getMyAccess: async (params = {}) => {
    const response = await axiosInstance.get('/api/notes/access/my-access/', { params });
    return extractResults(response.data);
  },
};

// ============= BlockNote Image Upload =============

export const noteImageAPI = {
  // Upload image for BlockNote editor
  upload: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axiosInstance.post(
      '/api/notes/upload_image/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// ============= Public Note APIs (No Auth) =============

export const publicNoteAPI = {
  // Browse public notes
  browse: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/notes/public/browse/', { params });
      return extractResults(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Retry without auth headers if token is invalid
        const baseURL = axiosInstance.defaults.baseURL || '';
        const response = await axios.get(`${baseURL}/api/notes/public/browse/`, { params });
        return extractResults(response.data);
      }
      throw error;
    }
  },

  // Get public note detail
  getDetail: async (slugOrId) => {
    try {
      const response = await axiosInstance.get(`/api/notes/${slugOrId}/public_detail/`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Retry without auth headers
        const baseURL = axiosInstance.defaults.baseURL || '';
        const response = await axios.get(`${baseURL}/api/notes/${slugOrId}/public_detail/`);
        return response.data;
      }
      throw error;
    }
  },

  // Search notes
  search: async (query, params = {}) => {
    try {
        const response = await axiosInstance.get('/api/notes/public/browse/', {
            params: { search: query, ...params }
        });
        return extractResults(response.data);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const baseURL = axiosInstance.defaults.baseURL || '';
            const response = await axios.get(`${baseURL}/api/notes/public/browse/`, {
                params: { search: query, ...params }
            });
            return extractResults(response.data);
        }
        throw error;
    }
  },
};

export default {
  noteAPI,
  noteAttachmentAPI,
  notePurchaseAPI,
  noteAccessAPI,
  noteImageAPI,
  publicNoteAPI,
};
