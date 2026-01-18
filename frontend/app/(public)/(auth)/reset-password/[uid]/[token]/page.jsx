'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/authService';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input'; // Import the new component
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

// --- Zod Schema ---
const resetPasswordSchema = z.object({
  new_password1: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  new_password2: z.string()
}).refine((data) => data.new_password1 === data.new_password2, {
  message: "Passwords do not match",
  path: ["new_password2"], // Attach error to confirm field
});

export default function ResetPasswordConfirmPage({ params }) {
  // Unwrap params for Next.js 13+ App Router
  const { uid, token } = use(params);
  const router = useRouter();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  // 1. Define Form
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password1: "",
      new_password2: "",
    },
  });

  const { isSubmitting } = form.formState;

  // 2. Handle Submit
  const onSubmit = async (values) => {
    setServerError('');
    
    try {
      await authService.confirmPasswordReset({
        uid,
        token,
        new_password1: values.new_password1,
        new_password2: values.new_password2
      });
      
      setIsSuccess(true);
      
      // Optional: Auto redirect after few seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.new_password1?.[0] || 
                  err.response?.data?.detail || 
                  'Failed to reset password. The link may be invalid or expired.';
      setServerError(msg);
    }
  };

  // 3. Render Success State
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4">
        <Card className="w-full max-w-md border shadow-xl shadow-slate-200/40 animate-in fade-in zoom-in duration-300">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Password Reset!</h2>
              <p className="text-slate-500 max-w-xs mx-auto">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
            </div>
            <Button asChild className="w-full bg-slate-900 hover:bg-slate-800" size="lg">
              <Link href="/login">
                Back to Login <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Render Form State
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4">
      <Card className="w-full max-w-md border shadow-xl shadow-slate-200/40">
        <CardHeader className="space-y-1 text-center pb-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Set new password</CardTitle>
          <CardDescription>
            Choose a strong password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="new_password1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="new_password2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600 font-medium animate-in slide-in-from-top-1">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}