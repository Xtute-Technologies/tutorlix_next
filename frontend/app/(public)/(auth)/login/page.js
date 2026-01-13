'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormBuilder from '@/components/FormBuilder';
import { loginSchema } from '@/lib/validations';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (data) => {
    setError('');
    
    const credentials = {
      password: data.password,
      ...(loginMethod === 'email' ? { email: data.email } : { phone: data.phone }),
    };

    const result = await login(credentials);
    
    if (!result.success) {
      setError(result.error);
      throw new Error(result.error);
    }
  };

  // Email login form configuration
  const emailFormConfig = {
    schema: loginSchema,
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: handleLogin,
    fields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'Enter your email',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
      },
    ],
    submitButton: {
      text: 'Login',
      loadingText: 'Logging in...',
    },
    error,
  };

  // Phone login form configuration
  const phoneFormConfig = {
    schema: loginSchema,
    defaultValues: {
      phone: '',
      password: '',
    },
    onSubmit: handleLogin,
    fields: [
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '+919876543210',
        description: 'Include country code (e.g., +91 for India)',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
      },
    ],
    submitButton: {
      text: 'Login',
      loadingText: 'Logging in...',
    },
    error,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Tutorlix
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
              loginMethod === 'email'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('phone');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b transition-colors ${
              loginMethod === 'phone'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Phone
          </button>
        </div>

        {/* Form */}
        <div className="mt-8 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <FormBuilder config={loginMethod === 'email' ? emailFormConfig : phoneFormConfig} />

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
