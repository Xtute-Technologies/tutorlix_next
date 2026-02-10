'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from '@/lib/axios';
import Script from 'next/script';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function PublicPaymentPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { uuid } = params;
    const type = searchParams.get('type');

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
            let response;
            if (type === 'note') {
                response = await axios.get(`/api/notes/purchases/details_public/${uuid}/`);
                setBookingData({ isNote: true, ...response.data });
            } else {
                response = await axios.get(`/api/lms/bookings/details_public/${uuid}/`);
                setBookingData(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || "Failed to load details.");
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

        let options = {};
        if (bookingData.isNote) {
            options = {
                key: bookingData.key,
                amount: bookingData.amount,
                currency: bookingData.currency,
                name: bookingData.name,
                description: bookingData.description,
                order_id: bookingData.order_id,
                prefill: bookingData.prefill,
                theme: bookingData.theme,
                handler: async function (response) {
                    try {
                        await axios.post('/api/notes/purchases/verify_payment/', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        router.push(`/payment-success?status=success&type=note&noteId=${bookingData.note_id}`);
                    } catch (verifyErr) {
                        alert("Payment verification failed. Please contact support.");
                        setProcessing(false);
                    }
                }
            };
        } else {
            options = {
                key: bookingData.razorpay_key_id,
                amount: bookingData.booking.final_amount * 100,
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
                        router.push('/payment-success?status=success&razorpay_payment_id=' + response.razorpay_payment_id + '&razorpay_payment_link_reference_id=' + bookingData.booking.id);
                    } catch (verifyErr) {
                        alert("Payment verification failed. Please contact support.");
                        setProcessing(false);
                    }
                },
                prefill: {
                    name: bookingData.booking.student_name,
                    email: bookingData.booking.student_email,
                    contact: bookingData.booking.student_phone
                },
                theme: { color: "#eab308" },
            };
        }
        
        options.modal = { ondismiss: () => setProcessing(false) };
        const rzp1 = new window.Razorpay(options);
        rzp1.open();
    };

    if (loading) return <div className="h-screen flex justify-center items-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (error) return <div className="h-screen flex justify-center items-center flex-col gap-4 text-destructive bg-background"><AlertCircle className="h-12 w-12" /><p className="text-xl font-semibold">{error}</p></div>;

    if (type === 'note' && bookingData?.status === 'paid') {
        return (
            <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
                <Card className="w-full max-w-md shadow-lg border-emerald-500/20 bg-card">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold">Payment Completed</CardTitle>
                        <CardDescription>{bookingData.message || "You have already purchased this note."}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button onClick={() => router.push('/')}>Go to Home</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (bookingData?.booking?.payment_status === "expired") {
        return (
            <div className="h-screen flex justify-center items-center bg-background">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold text-foreground">Payment Link Expired</CardTitle>
                        <CardDescription className="text-muted-foreground">This link is no longer valid.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">The payment link for this booking has been expired.</p>
                        {bookingData.booking.expired_at && (
                            <p className="text-xs text-muted-foreground">Expired on <span className="font-medium text-foreground">{new Date(bookingData.booking.expired_at).toLocaleString()}</span></p>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-center"><Button variant="outline" onClick={() => router.push("/")}>Go to Home</Button></CardFooter>
                </Card>
            </div>
        );
    }

    const { booking } = bookingData;

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-lg shadow-xl border-border bg-card">
                    <CardHeader className="text-center border-b bg-muted/30 rounded-t-lg">
                        <div className="flex justify-center mb-4">
                            <img src="/logo.png" alt="Tutorlix Logo" className="h-12 w-auto object-contain dark:invert" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">Checkout</CardTitle>
                        <CardDescription>Complete your purchase securely</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-6">
                        {bookingData.isNote ? (
                            /* NOTE VIEW */
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Item</h3>
                                    <p className="text-lg font-bold text-foreground">{bookingData.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Student</h3>
                                        <p className="font-medium text-foreground text-sm">{bookingData.prefill?.name}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phone</h3>
                                        <p className="font-medium text-foreground text-sm">{bookingData.prefill?.contact}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-lg font-bold">Total Amount</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{(bookingData.amount / 100).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        ) : (
                            /* ORIGINAL COURSE VIEW RESTORED */
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Course Name</h3>
                                    <p className="text-lg font-bold text-foreground">{booking.course_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Student Name</h3>
                                        <p className="font-medium text-foreground text-sm">{booking.student_name}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Email</h3>
                                        <p className="font-medium text-foreground text-sm">{booking.student_email}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground text-sm">Course Fee</span>
                                    <span className="font-medium text-foreground">₹{booking.price}</span>
                                </div>
                                {booking.discount_amount != '0.00' && (
                                    <div className="flex justify-between items-center text-emerald-600">
                                        <span className="text-sm">Discount</span>
                                        <span className="font-medium">- ₹{booking.discount_amount}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold">Total To Pay</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{booking.final_amount}</span>
                                </div>
                                {booking.sales_rep_email && (
                                    <div className="mt-2 pt-4 border-t border-dashed border-border">
                                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Sales Representative</h3>
                                        <p className="font-medium text-xs text-muted-foreground">{booking.sales_rep_email}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col bg-muted/30 rounded-b-lg p-6 space-y-6">
                        <Button className="w-full text-lg h-14 font-bold shadow-lg" onClick={handlePayment} disabled={processing}>
                            {processing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : "Pay Securely Now"}
                        </Button>

                        <div className="w-full text-center space-y-3">
                            <p className="text-[10px] text-muted-foreground">By proceeding, you agree to our policies.</p>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase text-muted-foreground/60">
                                <Link href="/terms" target="_blank" className="hover:text-primary underline decoration-muted-foreground/20">Terms</Link>
                                <Link href="/privacy" target="_blank" className="hover:text-primary underline decoration-muted-foreground/20">Privacy</Link>
                                <Link href="/cancellation" target="_blank" className="hover:text-primary underline decoration-muted-foreground/20">Refunds</Link>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 opacity-40">
                                <ShieldCheck className="h-3 w-3" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Verified Secure Payment</span>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}