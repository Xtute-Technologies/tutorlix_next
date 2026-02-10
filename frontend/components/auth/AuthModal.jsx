'use client';

import { useState } from 'react';
import { useAuthModal } from '@/context/AuthModalContext';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FormBuilder from '@/components/FormBuilder';
import { loginSchema, studentRegisterSchema } from '@/lib/validations';
import { useRouter } from 'next/navigation';

export default function AuthModal() {
  const { isOpen, closeAuthModal, view, setView } = useAuthModal();
  const { login, register } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleLogin = async (data) => {
    setError('');
    // Check if input looks like a phone number (all digits, length 10)
    const isPhone = /^\d{10}$/.test(data.email);
    
    const credentials = {
      password: data.password,
      ...(isPhone ? { phone: data.email } : { email: data.email }),
    };

    // Pass false to disable auto-redirect, we handle it here
    const result = await login(credentials, false);
    if (result.success) {
      closeAuthModal();
      
      if (window.location.pathname.startsWith('/notes/')) {
         // Stay on page/ Reload to trigger NoteDetailClient's role-based redirect logic
         window.location.reload(); 
      } else {
         // Default login behavior if not on a special page
         router.push('/dashboard');
         router.refresh();
      }
    } else {
      setError(result.error);
    }
  };

  const handleRegister = async (data) => {
    setError('');
    setSuccess('');
    
    const payload = { ...data, role: 'student' };
    
    const result = await register(payload);
    
    if (result.success) {
        setSuccess('Registration successful! A verification link has been sent to your email. Please verify your account to login.');
        
        // Switch to login view after a delay to allow user to read message
        setTimeout(() => {
            setSuccess(''); 
            setView('login');
        }, 5000);

    } else {
        if (typeof result.error === 'object') {
            const errorMessages = Object.entries(result.error)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('; ');
            setError(errorMessages);
        } else {
            setError(result.error);
        }
    }
  };

  const loginConfig = {
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: handleLogin,
    fields: [
      { name: 'email', label: 'Email or Phone', type: 'email', placeholder: 'name@example.com' },
      { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    ],
    submitButton: { text: 'Sign In', loadingText: 'Signing in...' },
    error,
  };

  const registerConfig = {
    schema: studentRegisterSchema,
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
      { name: 'first_name', label: 'First Name', type: 'text', placeholder: 'John' },
      { name: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Doe' },
      { name: 'username', label: 'Username', type: 'text', placeholder: 'johndoe' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
      { name: 'phone', label: 'Phone', type: 'phone', placeholder: '9876543210' },
      { name: 'state', label: 'State', type: 'state_names', placeholder: 'Select State' },
      { name: 'password1', label: 'Password', type: 'password', placeholder: '••••••••' },
      { name: 'password2', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
    ],
    submitButton: { text: 'Create Account', loadingText: 'Creating account...' },
    error,
    success 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-center">
             {view === 'login' ? 'Enter your details to sign in' : 'Join us to access notes'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 py-4">
             <FormBuilder {...loginConfig} />
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 py-4">
             <FormBuilder {...registerConfig} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
