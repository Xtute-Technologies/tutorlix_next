'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormBuilder from '@/components/FormBuilder';
import { registerSchema } from '@/lib/validations';
import { useAuth } from '@/context/AuthContext';
import { Store } from 'lucide-react';

export default function SellerRegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const handleRegister = async (data) => {
    setError('');
    setSuccess('');
    
    // Force role to 'seller' regardless of form defaults
    const payload = { ...data, role: 'seller' };
    
    const result = await registerUser(payload);
    
    if (!result.success) {
      if (typeof result.error === 'object') {
        const errorMessages = Object.entries(result.error)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
        setError(errorMessages);
      } else {
        setError(result.error);
      }
      // Don't throw error here to allow UI to show it, just return
      return; 
    } else {
      setSuccess('Account created successfully! Please check your email to verify your account before logging in.');
      setTimeout(() => router.push('/login'), 5000);
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
      // We set this here, but also enforce it in handleRegister
      role: 'seller', 
    },
    onSubmit: handleRegister,
    fields: [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'Choose a unique username',
        description: 'This will be your shop identifier',
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'business@example.com',
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
        description: 'For important business updates',
      },
      {
        name: 'state',
        label: 'State',
        type: 'state_names',
        placeholder: 'State',
      },
      // ROLE FIELD REMOVED - Fixed to 'seller' in logic
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
      text: 'Start Selling',
      loadingText: 'Setting up your shop...',
    },
    error,
    success,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Store className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Become a Tutorlix Seller
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
            Join our platform to reach thousands of students. Create your seller account today.
          </p>
        </div>

        {/* Form */}
        <div className=" py-8 px-4 sm:rounded-xl sm:px-10">
          <FormBuilder config={formConfig} />
          
          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}