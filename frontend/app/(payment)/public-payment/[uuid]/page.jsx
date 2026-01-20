'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function PublicPaymentPage() {
    const params = useParams();
    const router = useRouter();
    const { uuid } = params;
    
    const [loading, setLoading] = useState(true);
    const [bookingData, setBookingData] = useState(null);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (uuid) {
            fetchBookingDetails();
        }
    }, [uuid]);

    const fetchBookingDetails = async () => {
        try {
            const response = await axios.get(`/api/lms/bookings/details_public/${uuid}/`);
            setBookingData(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load booking details.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = () => {
        if (!bookingData || !window.Razorpay) {
            alert("Payment system not loaded completely. Please refresh.");
            return;
        }

        setProcessing(true);

        const options = {
            key: bookingData.razorpay_key_id,
            amount: bookingData.booking.final_amount * 100, // Amount is in currency subunit
            currency: "INR",
            name: "Tutorlix",
            description: `Payment for ${bookingData.booking.course_name}`,
            order_id: bookingData.razorpay_order_id,
            handler: async function (response) {
                try {
                    await axios.post('/api/lms/bookings/verify_payment/', {
                        booking_id: bookingData.booking.booking_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    
                    // Allow server to process
                    router.push('/payment-success?status=success&razorpay_payment_id=' + response.razorpay_payment_id + '&razorpay_payment_link_reference_id=' + bookingData.booking.id);
                } catch (verifyErr) {
                    console.error(verifyErr);
                    alert("Payment verification failed. Please contact support.");
                    setProcessing(false);
                }
            },
            prefill: {
                name: bookingData.booking.student_name,
                email: bookingData.booking.student_email,
                contact: bookingData.booking.student_phone
            },
            theme: {
                color: "#eab308"
            },
            image: window.location.origin + '/logo.png',
            modal: {
                ondismiss: function() {
                    setProcessing(false);
                }
            }
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert(response.error.description);
            setProcessing(false);
        });
        rzp1.open();
    };

    if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    
    if (error) return <div className="h-screen flex justify-center items-center flex-col gap-4 text-red-500"><AlertCircle className="h-12 w-12" /><p className="text-xl font-semibold">{error}</p></div>;

    if (bookingData?.status === 'paid') {
         return (
             <div className="h-screen flex justify-center items-center flex-col gap-4">
                 <CheckCircle className="h-16 w-16 text-green-500" />
                 <h1 className="text-2xl font-bold">Payment Already Completed</h1>
                 <p>This booking has already been paid for.</p>
                 <Button onClick={() => router.push('/')}>Go To Home</Button>
             </div>
         )
    }

    const { booking } = bookingData;

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader className="text-center border-b bg-white rounded-t-lg">
                        <div className="flex justify-center mb-4">
                            <img src="/logo.png" alt="Tutorlix Logo" className="h-16 w-auto object-contain" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-primary">Complete Your Enrollment</CardTitle>
                        <CardDescription>Secure payment for your course</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Course Name</h3>
                                <p className="text-lg font-semibold">{booking.course_name}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Student Name</h3>
                                    <p className="font-medium">{booking.student_name}</p>
                                </div>
                                <div>
                                     <h3 className="text-sm font-medium text-gray-500">Email</h3>
                                     <p className="font-medium">{booking.student_email}</p>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Course Fee</span>
                                <span className="font-medium">₹{booking.price}</span>
                            </div>
                            
                            {booking.discount_amount != '0.00' && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span>Discount</span>
                                    <span>- ₹{booking.discount_amount}</span>
                                </div>
                            )}
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span>Total To Pay</span>
                                <span>₹ {booking.final_amount} </span>
                            </div>

                            {booking.sales_rep_email && (
                                <div className="mt-2 pt-4 border-t border-dashed">
                                     <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Sales Representative</h3>
                                     <p className="font-medium text-sm text-gray-600">{booking.sales_rep_email}</p>
                                </div>
                            )}
                        </div>

                    </CardContent>
                    <CardFooter className="bg-gray-50 p-6 rounded-b-lg">
                        <Button 
                            className="w-full text-lg py-6" 
                            size="lg" 
                            onClick={handlePayment}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                            ) : (
                                `Pay Now`
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
