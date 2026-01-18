'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormBuilder from '@/components/FormBuilder';
import { loginSchema } from '@/lib/validations';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState('email');
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
      // Don't throw, let the FormBuilder handle the error state
    }
  };

  const commonFields = [
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: '••••••••',
    },
  ];

  const emailFormConfig = {
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: handleLogin,
    fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'name@example.com' },
      ...commonFields,
    ],
    submitButton: { text: 'Sign In', loadingText: 'Signing in...' },
    error,
  };

  const phoneFormConfig = {
    schema: loginSchema,
    defaultValues: { phone: '', password: '' },
    onSubmit: handleLogin,
    fields: [
      { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+919876543210' },
      ...commonFields,
    ],
    submitButton: { text: 'Sign In', loadingText: 'Signing in...' },
    error,
  };

  return (
    <div className="min-h-screen w-full flex">


      {/* --- Right Side: Login Form --- */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white relative">
        <div className="w-full max-w-sm space-y-8">
        

          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
            {/* <p className="mt-2 text-sm text-slate-500">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-purple-600 hover:text-purple-500 transition-colors">
                Sign up for free
              </Link>
            </p> */}
          </div>

          {/* Method Toggle (Subtle) */}
          {/* <div className="flex p-1 bg-slate-100/50 rounded-lg">
            {['email', 'phone'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => { setLoginMethod(method); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                  loginMethod === method
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {method}
              </button>
            ))}
          </div> */}

          {/* Form Container */}
          <div className="mt-8">
            <FormBuilder config={loginMethod === 'email' ? emailFormConfig : phoneFormConfig} />
            
            <div className="mt-6 text-center lg:text-left">
              <Link href="/forgot-password" className="text-sm font-medium text-purple-600 hover:text-purple-500 transition-colors">
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}