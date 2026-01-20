'use client';

import { useEffect, useState } from 'react';
import { bookingAPI } from '@/lib/lmsService';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <div className="text-xs text-slate-500">ID: {row.original.booking_id?.substring(0, 8)}...</div>
        </div>
      )
    },
    {
      accessorKey: 'booking_date',
      header: 'Booking Date',
      cell: ({ row }) => row.original.booking_date ? format(new Date(row.original.booking_date), 'PPP') : '-'
    },
    {
      accessorKey: 'course_expiry_date',
      header: 'Expiry Date',
      cell: ({ row }) => {
        const expiry = row.original.course_expiry_date;
        if (!expiry) return <span className="text-green-600 font-medium">Lifetime Access</span>;
        const isExpired = new Date(expiry) < new Date();
        return (
          <span className={isExpired ? "text-red-500 font-bold" : "text-slate-700"}>
            {format(new Date(expiry), 'PPP')}
            {isExpired && " (Expired)"}
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
      accessorKey: 'sales_rep_name',
      header: 'Sales Rep',
      cell: ({ row }) => row.original.sales_rep_name || '-'
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.payment_status;
        const map = {
          paid: 'bg-green-100 text-green-800 hover:bg-green-100',
          pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
          failed: 'bg-red-100 text-red-800 hover:bg-red-100',
          refunded: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
        };
        return <Badge className={map[status] || ''} variant="outline">{status?.toUpperCase()}</Badge>;
      }
    },
    {
      id: 'actions',
      header: 'Link',
      cell: ({ row }) => row.original.payment_link && row.original.payment_status !== 'paid' ? (
        <Button size="sm" variant="outline" asChild>
          <a href={row.original.payment_link} target="_blank" rel="noopener noreferrer">
            Pay Now <ExternalLink className="h-3 w-3 ml-2" />
          </a>
        </Button>
      ) : row.original.payment_status === 'paid' ? (
        <Badge variant="outline" className="border-green-200 text-green-700">Paid</Badge>
      ) : null
    }
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 ">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground">Manage your course enrollments and payments.</p>
      </div>


      <DataTable columns={columns} data={bookings} searchKey="course_name" />


    </div>
  );
}
