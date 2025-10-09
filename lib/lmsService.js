import axiosInstance from './axios';

// Helper function to extract results from paginated response
const extractResults = (response) => {
  // If response has 'results' key (paginated), return results array
  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  // If response is already an array, return as is
  if (Array.isArray(response.data)) {
    return response.data;
  }
  // If it's a single object, return as is
  return response.data;
};

// ============= Category APIs =============

export const categoryAPI = {
  // Get all categories
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/categories/', { params });
    return extractResults(response);
  },

  // Get single category
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/categories/${id}/`);
    return response.data;
  },

  // Create category
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/categories/', data);
    return response.data;
  },

  // Update category
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/categories/${id}/`, data);
    return response.data;
  },

  // Delete category
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/categories/${id}/`);
    return response.data;
  },

  // Get products in category
  getProducts: async (id) => {
    const response = await axiosInstance.get(`/api/lms/categories/${id}/products/`);
    return extractResults(response);
  },
};

// ============= Product APIs =============

export const productAPI = {
  // Get all products
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/products/', { params });
    return extractResults(response);
  },

  // Get single product
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/products/${id}/`);
    return response.data;
  },

  // Create product
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/products/', data);
    return response.data;
  },

  // Update product
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/products/${id}/`, data);
    return response.data;
  },

  // Delete product
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/products/${id}/`);
    return response.data;
  },

  // Upload product images
  uploadImages: async (id, images) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await axiosInstance.post(
      `/api/lms/products/${id}/upload_images/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Set primary image
  setPrimaryImage: async (productId, imageId) => {
    const response = await axiosInstance.patch(
      `/api/lms/products/${productId}/set_primary_image/`,
      { image_id: imageId }
    );
    return response.data;
  },

  // Delete product image
  deleteImage: async (productId, imageId) => {
    const response = await axiosInstance.delete(
      `/api/lms/products/${productId}/delete_image/`,
      { data: { image_id: imageId } }
    );
    return response.data;
  },

  // Get featured products
  getFeatured: async () => {
    const response = await axiosInstance.get('/api/lms/products/featured/');
    return extractResults(response);
  },
};

// ============= Offer APIs =============

export const offerAPI = {
  // Get all offers
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/offers/', { params });
    return extractResults(response);
  },

  // Get single offer
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/offers/${id}/`);
    return response.data;
  },

  // Create offer
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/offers/', data);
    return response.data;
  },

  // Update offer
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/offers/${id}/`, data);
    return response.data;
  },

  // Delete offer
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/offers/${id}/`);
    return response.data;
  },

  // Validate coupon code
  validateCode: async (code, productId) => {
    const response = await axiosInstance.post('/api/lms/offers/validate_code/', {
      code,
      product_id: productId,
    });
    return response.data;
  },
};

// ============= Course Booking APIs =============

export const bookingAPI = {
  // Get all bookings
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/bookings/', { params });
    return extractResults(response);
  },

  // Get single booking
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/bookings/${id}/`);
    return response.data;
  },

  // Create booking
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/bookings/', data);
    return response.data;
  },

  // Update booking
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/bookings/${id}/`, data);
    return response.data;
  },

  // Delete booking
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/bookings/${id}/`);
    return response.data;
  },

  // Update payment status
  updatePaymentStatus: async (id, paymentStatus) => {
    const response = await axiosInstance.patch(
      `/api/lms/bookings/${id}/update_payment_status/`,
      { payment_status: paymentStatus }
    );
    return response.data;
  },

  // Get booking statistics
  getStatistics: async () => {
    const response = await axiosInstance.get('/api/lms/bookings/statistics/');
    return response.data;
  },
};

// ============= Test Score APIs =============

export const testScoreAPI = {
  // Get all test scores
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/test-scores/', { params });
    return extractResults(response);
  },

  // Get single test score
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/test-scores/${id}/`);
    return response.data;
  },

  // Create test score
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/test-scores/', data);
    return response.data;
  },

  // Update test score
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/test-scores/${id}/`, data);
    return response.data;
  },

  // Delete test score
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/test-scores/${id}/`);
    return response.data;
  },
};

// ============= Expense APIs =============

export const expenseAPI = {
  // Get all expenses
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/expenses/', { params });
    return extractResults(response);
  },

  // Get single expense
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/expenses/${id}/`);
    return response.data;
  },

  // Create expense
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/expenses/', data);
    return response.data;
  },

  // Update expense
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/expenses/${id}/`, data);
    return response.data;
  },

  // Delete expense
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/expenses/${id}/`);
    return response.data;
  },

  // Get expense summary
  getSummary: async () => {
    const response = await axiosInstance.get('/api/lms/expenses/summary/');
    return response.data;
  },
};

// ============= Contact Message APIs =============

export const contactMessageAPI = {
  // Get all messages
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/contact-messages/', { params });
    return extractResults(response);
  },

  // Get single message
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/contact-messages/${id}/`);
    return response.data;
  },

  // Create message (public)
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/contact-messages/', data);
    return response.data;
  },

  // Update message
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/contact-messages/${id}/`, data);
    return response.data;
  },

  // Delete message
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/contact-messages/${id}/`);
    return response.data;
  },

  // Assign message to user
  assign: async (id, userId) => {
    const response = await axiosInstance.patch(`/api/lms/contact-messages/${id}/assign/`, {
      assigned_to: userId,
    });
    return response.data;
  },

  // Update message status
  updateStatus: async (id, status) => {
    const response = await axiosInstance.patch(`/api/lms/contact-messages/${id}/update_status/`, {
      status,
    });
    return response.data;
  },
};

// ============= Main Course APIs =============

export const mainCourseAPI = {
  // Get all main courses
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/main-courses/', { params });
    return extractResults(response);
  },

  // Get single main course
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/main-courses/${id}/`);
    return response.data;
  },

  // Create main course
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/main-courses/', data);
    return response.data;
  },

  // Update main course
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/main-courses/${id}/`, data);
    return response.data;
  },

  // Delete main course
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/main-courses/${id}/`);
    return response.data;
  },

  // Get classes for main course
  getClasses: async (id) => {
    const response = await axiosInstance.get(`/api/lms/main-courses/${id}/classes/`);
    return extractResults(response);
  },
};

// ============= Student Specific Class APIs =============

export const studentClassAPI = {
  // Get all student classes
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/student-classes/', { params });
    return extractResults(response);
  },

  // Get single student class
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/student-classes/${id}/`);
    return response.data;
  },

  // Create student class
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/student-classes/', data);
    return response.data;
  },

  // Update student class
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/student-classes/${id}/`, data);
    return response.data;
  },

  // Delete student class
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/student-classes/${id}/`);
    return response.data;
  },

  // Add students to class
  addStudents: async (id, studentIds) => {
    const response = await axiosInstance.post(`/api/lms/student-classes/${id}/add_students/`, {
      student_ids: studentIds,
    });
    return response.data;
  },

  // Remove students from class
  removeStudents: async (id, studentIds) => {
    const response = await axiosInstance.post(`/api/lms/student-classes/${id}/remove_students/`, {
      student_ids: studentIds,
    });
    return response.data;
  },
};

// ============= Course Specific Class APIs =============

export const courseClassAPI = {
  // Get all course classes
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/course-classes/', { params });
    return extractResults(response);
  },

  // Get single course class
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/course-classes/${id}/`);
    return response.data;
  },

  // Create course class
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/course-classes/', data);
    return response.data;
  },

  // Update course class
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/course-classes/${id}/`, data);
    return response.data;
  },

  // Delete course class
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/course-classes/${id}/`);
    return response.data;
  },
};

// ============= Recording APIs =============

export const recordingAPI = {
  // Get all recordings
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/recordings/', { params });
    return extractResults(response);
  },

  // Get single recording
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/recordings/${id}/`);
    return response.data;
  },

  // Create recording
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/recordings/', data);
    return response.data;
  },

  // Update recording
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/recordings/${id}/`, data);
    return response.data;
  },

  // Delete recording
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/recordings/${id}/`);
    return response.data;
  },

  // Add students to recording
  addStudents: async (id, studentIds) => {
    const response = await axiosInstance.post(`/api/lms/recordings/${id}/add_students/`, {
      student_ids: studentIds,
    });
    return response.data;
  },

  // Remove students from recording
  removeStudents: async (id, studentIds) => {
    const response = await axiosInstance.post(`/api/lms/recordings/${id}/remove_students/`, {
      student_ids: studentIds,
    });
    return response.data;
  },
};

// ============= Attendance APIs =============

export const attendanceAPI = {
  // Get all attendance
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/api/lms/attendance/', { params });
    return extractResults(response);
  },

  // Get single attendance
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/lms/attendance/${id}/`);
    return response.data;
  },

  // Create attendance
  create: async (data) => {
    const response = await axiosInstance.post('/api/lms/attendance/', data);
    return response.data;
  },

  // Update attendance
  update: async (id, data) => {
    const response = await axiosInstance.patch(`/api/lms/attendance/${id}/`, data);
    return response.data;
  },

  // Delete attendance
  delete: async (id) => {
    const response = await axiosInstance.delete(`/api/lms/attendance/${id}/`);
    return response.data;
  },

  // Mark attendance for students
  markAttendance: async (id, attendanceRecords) => {
    const response = await axiosInstance.post(`/api/lms/attendance/${id}/mark_attendance/`, {
      attendance_records: attendanceRecords,
    });
    return response.data;
  },
};

// Export all APIs
export default {
  category: categoryAPI,
  product: productAPI,
  offer: offerAPI,
  booking: bookingAPI,
  mainCourse: mainCourseAPI,
  studentClass: studentClassAPI,
  courseClass: courseClassAPI,
  recording: recordingAPI,
  attendance: attendanceAPI,
  testScore: testScoreAPI,
  expense: expenseAPI,
  contactMessage: contactMessageAPI,
};

