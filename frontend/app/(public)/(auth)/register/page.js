'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormBuilder from '@/components/FormBuilder';
import { registerSchema } from '@/lib/validations';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const handleRegister = async (data) => {
    setError('');
    setSuccess('');
    
    const result = await registerUser(data);
    
    if (!result.success) {
      // Handle field-specific errors
      if (typeof result.error === 'object') {
        const errorMessages = Object.entries(result.error)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
        setError(errorMessages);
      } else {
        setError(result.error);
      }
      throw new Error(result.error);
    } else {
      setSuccess('Registration successful! Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 1500);
    }
  };

  const formConfig = {
    schema: registerSchema,
    defaultValues: {
      username: '',
      email: '',
      password1: '',
      password2: '',
      first_name: '',
      last_name: '',
      phone: '',
      state: '',
      role: 'student',
    },
    onSubmit: handleRegister,
    fields: [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'Choose a unique username',
        description: 'This will be your unique identifier',
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'your.email@example.com',
      },
      {
        name: 'first_name',
        label: 'First Name',
        type: 'text',
        placeholder: 'John',
      },
      {
        name: 'last_name',
        label: 'Last Name',
        type: 'text',
        placeholder: 'Doe',
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '+919876543210',
        description: 'Include country code (e.g., +91 for India)',
      },
     
      {
        name: 'state',
        label: 'State/Province (Optional)',
        type: 'text',
        placeholder: 'California',
      },
      {
        name: 'role',
        label: 'I want to join as',
        type: 'select',
        placeholder: 'Select your role',
        options: [
          { value: 'student', label: 'Student - Learn new skills' },
          { value: 'teacher', label: 'Teacher - Teach courses' },
          { value: 'seller', label: 'Seller - Sell courses' },
        ],
      },
      {
        name: 'password1',
        label: 'Password',
        type: 'password',
        placeholder: 'Create a strong password',
      },
      {
        name: 'password2',
        label: 'Confirm Password',
        type: 'password',
        placeholder: 'Re-enter your password',
      },
    ],
    submitButton: {
      text: 'Create Account',
      loadingText: 'Creating your account...',
    },
    error,
    success,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your Tutorlix account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <FormBuilder config={formConfig} />
        </div>
      </div>
    </div>
  );
}
