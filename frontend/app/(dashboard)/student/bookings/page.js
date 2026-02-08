'use client';

import { useEffect, useState } from 'react';
import { bookingAPI } from '@/lib/lmsService';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ExternalLink,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StudentBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📜 Payment history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBooking, setHistoryBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingAPI.getAll();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">
          {row.original.course_name}
          <div className="text-xs text-slate-500">
            ID: {row.original.booking_id?.slice(0, 8)}...
          </div>
        </div>
      )
    },
    {
      accessorKey: 'booking_date',
      header: 'Booking Date',
      cell: ({ row }) =>
        row.original.booking_date
          ? format(new Date(row.original.booking_date), 'PPP')
          : '-'
    },
    {
      accessorKey: 'course_expiry_date',
      header: 'Course Expiry',
      cell: ({ row }) => {
        const expiry = row.original.course_expiry_date;
        if (!expiry) {
          return (
            <span className="text-green-600 font-medium">
              Lifetime Access
            </span>
          );
        }

        const isExpired = new Date(expiry) < new Date();
        return (
          <span
            className={
              isExpired
                ? 'text-red-500 font-bold'
                : 'text-slate-700'
            }
          >
            {format(new Date(expiry), 'PPP')}
            {isExpired && ' (Expired)'}
          </span>
        );
      }
    },
    {
      accessorKey: 'final_amount',
      header: 'Price',
      cell: ({ row }) => `₹${row.original.final_amount}`
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.payment_status;
        const map = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-red-100 text-red-800',
          expired: 'bg-gray-100 text-gray-600'
        };

        return (
          <Badge variant="outline" className={map[status] || ''}>
            {status?.toUpperCase()}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const booking = row.original;

        return (
          <div className="flex gap-2 items-center">
            {/* ✅ PAY NOW — reusable until expired */}
            {booking.payment_status !== 'expired' && booking.payment_link && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={booking.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pay Now <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}

            {/* 📜 PAYMENT HISTORY */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setHistoryBooking(booking);
                setHistoryOpen(true);
              }}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          My Bookings
        </h1>
        <p className="text-muted-foreground">
          View your courses and payment history.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        searchKey="course_name"
      />

      {/* ================= PAYMENT HISTORY MODAL ================= */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>

          {Array.isArray(historyBooking?.payment_histories) &&
            historyBooking.payment_histories.length > 0 ? (
            <div className="space-y-3">
              {[...historyBooking.payment_histories]
                .sort(
                  (a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        ₹{p.amount} — {p.status.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.created_at
                          ? format(new Date(p.created_at), 'PPpp')
                          : '-'}
                      </div>
                      {p.razorpay_payment_id && (
                        <div className="text-xs text-gray-400">
                          Payment ID: {p.razorpay_payment_id}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        p.status === 'paid'
                          ? 'border-green-300 text-green-700'
                          : p.status === 'failed'
                            ? 'border-red-300 text-red-700'
                            : 'border-yellow-300 text-yellow-700'
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No payment attempts yet.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
