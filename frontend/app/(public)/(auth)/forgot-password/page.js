'use client';

import { useState } from 'react';
import { authService } from '@/lib/authService';
import Link from 'next/link';
import FormBuilder from '@/components/FormBuilder';
import { forgotPasswordSchema } from '@/lib/validations';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data) => {
    setError('');
    setSuccess(false);

    try {
      await authService.requestPasswordReset(data.email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
      throw err;
    }
  };

  const formConfig = {
    schema: forgotPasswordSchema,
    defaultValues: {
      email: '',
    },
    onSubmit: handleSubmit,
    fields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'Enter your registered email',
        description: 'We will send you a password reset link',
      },
    ],
    submitButton: {
      text: 'Send Reset Link',
      loadingText: 'Sending...',
    },
    error,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Check your email</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    We haveve sent you an email with instructions to reset your password.
                    Please check your inbox and follow the link.
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-green-800 hover:text-green-700"
                  >
                    Back to login →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <FormBuilder config={formConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
