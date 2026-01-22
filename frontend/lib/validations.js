import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
  path: ['email'],
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password1: z.string().min(8, 'Password must be at least 8 characters'),
  password2: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  
  // Updated Phone: Compulsory, exactly 10 digits, only numbers
  phone: z.string()
    .min(1, 'Phone number is required')
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^\d+$/, 'Phone number must contain only numbers'),
    
  // Updated State: Compulsory (cannot be empty)
  state: z.string().min(1, 'State is required'),
  
  // Updated Role: Compulsory (Removed .default to force selection)
  role: z.enum(['student', 'teacher', 'seller', 'admin'], {
    errorMap: () => ({ message: "Please select a role" })
  }),
}).refine((data) => data.password1 === data.password2, {
  message: 'Passwords do not match',
  path: ['password2'],
});


export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^\d+$/, 'Phone number must contain only numbers'),

  state: z.string().optional(),
  bio: z.string().optional(),
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  new_password1: z.string().min(8, 'Password must be at least 8 characters'),
  new_password2: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.new_password1 === data.new_password2, {
  message: 'Passwords do not match',
  path: ['new_password2'],
});
