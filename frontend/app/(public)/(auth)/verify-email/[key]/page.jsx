'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/authService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage({ params }) {
  const { key } = use(params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function verify() {
      try {
        const decodedKey = decodeURIComponent(key);
        await authService.verifyEmail(decodedKey);
        if (mounted) {
          setIsSuccess(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.detail || 'Verification failed. The link might be expired or invalid.');
          setIsLoading(false);
        }
      }
    }

    if (key) {
      verify();
    }

    return () => {
      mounted = false;
    };
  }, [key]);

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-center'>Email Verification</CardTitle>
          <CardDescription className='text-center'>
            Verifying your email address...
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col items-center gap-4'>
          {isLoading ? (
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='h-12 w-12 animate-spin text-primary' />
              <p className='text-sm text-gray-500'>Please wait while we verify your email...</p>
            </div>
          ) : isSuccess ? (
            <div className='flex flex-col items-center gap-4 text-center'>
              <CheckCircle2 className='h-16 w-16 text-green-500' />
              <div className='space-y-2'>
                <h3 className='text-xl font-medium'>Email Verified!</h3>
                <p className='text-gray-500'>
                  Your email has been successfully verified. You can now log in to your account.
                </p>
              </div>
              <Button asChild className='w-full'>
                <Link href='/login'>Go to Login</Link>
              </Button>
            </div>
          ) : (
            <div className='flex flex-col items-center gap-4 text-center'>
              <XCircle className='h-16 w-16 text-red-500' />
              <div className='space-y-2'>
                <h3 className='text-xl font-medium'>Verification Failed</h3>
                <p className='text-red-500'>{error}</p>
              </div>
              <Button asChild variant='outline' className='w-full'>
                <Link href='/contact'>Contact Support</Link>
              </Button>
              <Button asChild variant='link' className='w-full'>
                <Link href='/login'>Back to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
