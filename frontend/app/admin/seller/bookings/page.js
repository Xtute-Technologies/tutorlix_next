'use client';

import { useEffect, useState } from 'react';
import { bookingAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const bookingsRes = await bookingAPI.getAll({ ordering: '-booking_date' });
      setBookings(bookingsRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const columns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.student_name}</div>
          <div className="text-sm text-gray-500">{row.original.student?.email || row.original.student}</div>
        </div>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => row.original.course_name,
    },
    {
      accessorKey: 'final_amount',
      header: 'Amount',
      cell: ({ row }) => `₹${row.original.final_amount}`,
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment Status',
      cell: ({ row }) => {
        const colors = {
          paid: "bg-green-100 text-green-800",
          pending: "bg-yellow-100 text-yellow-800",
          failed: "bg-red-100 text-red-800",
          refunded: "bg-gray-100 text-gray-800"
        }
        return (
          <Badge className={colors[row.original.payment_status] || "bg-gray-100"}>
            {row.original.payment_status}
          </Badge>
        );
      },
    },
    {
      id: "payment_link",
      header: "Payment Link",
      cell: ({ row }) => (
        row.original.payment_link ? (
          <div className="flex items-center gap-2">
            <a href={row.original.payment_link} target="_blank" className="text-blue-600 underline text-sm truncate max-w-[150px]">
              Link
            </a>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(row.original.payment_link)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : <span className="text-gray-400 text-sm">N/A</span>
      )
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings History</h1>
          <p className="text-gray-600 mt-1">View list of all generated bookings</p>
        </div>
        <Link href="/admin/seller/create-booking">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        loading={loading}
        searchKey="student_name"
      />
    </div>
  );
}
