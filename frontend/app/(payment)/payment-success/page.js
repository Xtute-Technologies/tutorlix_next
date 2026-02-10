'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'sonner';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [bookingDetails, setBookingDetails] = useState(null);
  const router = useRouter(); // For redirection


  // Params
  const paymentId = searchParams.get('razorpay_payment_id');
  const paymentLinkStatus = searchParams.get('razorpay_payment_link_status');
  const manualStatus = searchParams.get('status');
  const type = searchParams.get('type'); // 'note' or course
  const noteId = searchParams.get('noteId');

  useEffect(() => {
    // 1. Handle Notes Logic separately
    if (type === 'note' && manualStatus === 'success') {
       setStatus('success');
       // Auto-redirect logic or Toast
       if (noteId) {
          toast.success("Purchase Successful", {
          description: "You have been enrolled in the note. Redirecting...",
        });
            
            // Redirect after delay
            setTimeout(() => {
                router.push(`/student/notes/${noteId}`);
            }, 2000);
       }
       return;
    }

    const verifyPayment = async () => {
        if (!paymentId) {
            if (manualStatus === 'failed' || paymentLinkStatus === 'expired') {
                setStatus('failed');
            }
            return;
        }

        try {
            const response = await axios.get(`/api/lms/bookings/check_payment_status/?payment_id=${paymentId}`);
            setBookingDetails(response.data);
            if (response.data.payment_status === 'paid') {
                setStatus('success');
            } else {
                setStatus('failed');
            }
        } catch (error) {
            console.error(error);
            // If API fails but we have success params, maybe we can show success?
            // But user asked for backend verification.
            setStatus('failed');
        }
    };

    if (paymentId) {
        verifyPayment();
    } else {
        // Handle cases without paymentId (e.g. just cancelled)
        if (manualStatus === 'success') setStatus('success'); 
        else if (manualStatus) setStatus('failed'); // Default to fail if no explicit success
    }
  }, [paymentId, manualStatus, paymentLinkStatus, type, noteId, router]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full text-center shadow-lg border-green-100">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === 'success' ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : status === 'failed' || status === 'expired' ? (
              <XCircle className="h-16 w-16 text-red-500" />
            ) : (
               <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'success' ? 'Payment Successful' : 
             status === 'failed' ? 'Payment Failed' : 
             status === 'expired' ? 'Link Expired' : 'Processing...'}
          </CardTitle>
          <CardDescription className="text-gray-500">
            {status === 'success' 
              ? (type === 'note' ? 'Your purchase has been confirmed. You will be redirected shortly.' : `Your booking for ${bookingDetails?.course_name || 'Course'} has been confirmed.`) 
              : 'We verified the transaction but found an issue.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           
           {status === 'success' && bookingDetails && (
               <div className="text-sm bg-gray-50 p-4 rounded-md text-left space-y-2">
                   <div className="flex justify-between">
                       <span className="text-gray-500">Amount Paid:</span>
                       <span className="font-semibold">₹{bookingDetails.final_amount}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-gray-500">Transaction ID:</span>
                       <span className="font-mono text-xs">{paymentId}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-gray-500">Booking ID:</span>
                        <span className="font-mono text-xs">{bookingDetails.booking_id}</span>
                   </div>
               </div>
           )}

           <div className="flex flex-col gap-3">
             {type === 'note' && noteId ? (
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <Link href={`/student/notes/${noteId}`}>Go to Note</Link>
                  </Button>
             ) : (
                 <Button asChild className="w-full">
                    <Link href="/dashboard">Login to Continue</Link>
                 </Button>
             )}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    )
}
