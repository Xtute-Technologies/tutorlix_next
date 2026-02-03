'use client';

import { useEffect, useState, useMemo } from 'react';
import { bookingAPI, sellerExpenseAPI } from '@/lib/lmsService'; // Added sellerExpenseAPI
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Plus, Eye, ExternalLink, User, CreditCard, TrendingUp, Wallet, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import DataTable from '@/components/DataTable';
import CreateBookingForm from './CreateBookingForm';
import { useAuth } from '@/context/AuthContext';
import CopyButton from '@/components/ui/copy-button';

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth()

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch both Bookings (Sales) and Expenses (Payouts)
      const [bookingsRes, expensesRes] = await Promise.all([
        bookingAPI.getAll({ ordering: '-booking_date' }),
        sellerExpenseAPI.getAll()
      ]);

      setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
      setExpenses(Array.isArray(expensesRes) ? expensesRes : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CALCULATIONS ---

  // 1. Sales Made (Total Revenue from Paid Bookings)
  const totalSales = useMemo(() => {
    return bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + parseFloat(b.final_amount || 0), 0);
  }, [bookings]);

  // 2. Money Received (Total Payouts/Expenses given to Seller)
  const totalReceived = useMemo(() => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [expenses]);

  // 3. Profit Contribution (Sales - Received)
  const profitContribution = totalSales - totalReceived;
  // const isProfitPositive = profitContribution >= 0;
  const isProfitPositive = profitContribution >= 0;

  // --- HANDLERS ---

  const handleBookingSuccess = () => {
    fetchData();
    setIsCreateDialogOpen(false);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleViewStudent = (bookingData) => {
    setSelectedBooking(bookingData);
    setStudentDialogOpen(true);
  };

  // --- COLUMNS FOR TABLE ---
  const columns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.student_name}</div>
            <div className="text-xs text-gray-500">{row.original?.student_email || "No email"}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate" title={row.original.course_name}>
          <span className="font-medium text-sm">{row.original.course_name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'final_amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-700">
          ₹{parseFloat(row.original.final_amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const colors = {
          paid: "bg-green-50 text-green-700 border-green-200",
          pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
          failed: "bg-red-50 text-red-700 border-red-200",
        };
        return (
          <Badge variant="outline" className={`${colors[row.original.payment_status] || "bg-gray-50"} capitalize border`}>
            {row.original.payment_status}
          </Badge>
        );
      },
    },
    {
      id: "payment_link",
      header: "Link",
      cell: ({ row }) => (
        row.original.payment_link ? (
          <CopyButton text={row.original.payment_link} />
        ) : <span className="text-gray-300">-</span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleViewStudent(row.original)}
        >
          <Eye className="h-4 w-4 text-gray-500" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your sales performance and earnings.</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Generate a payment link for a new student.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <CreateBookingForm onSuccess={handleBookingSuccess} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- PROMINENT STATS BOXES --- */}

      {user.role === "seller" &&
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* BOX 1: PROFIT CONTRIBUTION (Sales - Received) */}
          <Card className={`border-0 shadow-lg ${isProfitPositive ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-gradient-to-br from-gray-700 to-gray-800'} text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="h-24 w-24 transform translate-x-4 -translate-y-4" />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <span className="text-indigo-100 font-medium text-sm tracking-wide">NET CONTRIBUTION</span>
                <span className="text-3xl font-bold tracking-tight">
                  {isProfitPositive ? '+' : '-'}₹{Math.abs(profitContribution).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="mt-2 text-indigo-200 text-xs flex items-center gap-1">
                  {isProfitPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>Profit to Tutorlix (Sales - Payouts)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOX 2: MONEY RECEIVED (Payouts) */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="h-24 w-24 transform translate-x-4 -translate-y-4" />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <span className="text-blue-100 font-medium text-sm tracking-wide">MONEY RECEIVED</span>
                <span className="text-3xl font-bold tracking-tight">
                  ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="mt-2 text-blue-100 text-xs opacity-90">
                  Total payouts & commissions received
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOX 3: SALES MADE (Bookings) */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard className="h-24 w-24 transform translate-x-4 -translate-y-4" />
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <span className="text-emerald-100 font-medium text-sm tracking-wide">SALES MADE</span>
                <span className="text-3xl font-bold tracking-tight">
                  ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="mt-2 text-emerald-100 text-xs opacity-90">
                  Total value of paid courses sold
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* RECENT BOOKINGS TABLE */}
      <div>
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-800">Booking History</h3>
        </div>
        <DataTable
          columns={columns}
          data={bookings}
          loading={loading}
          searchKey="student_name"
          searchPlaceholder="Search student name..."
        />
      </div>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking ? (
            <div className="space-y-6 py-2 text-sm">
              {/* Student Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <User className="h-3 w-3" />
                  Student Information
                </h4>
                <div className="rounded-md border bg-gray-50/50 p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Full Name</p>
                    <p className="font-medium text-gray-900">{selectedBooking.student_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Email Address</p>
                    <p className="font-medium text-gray-900">{selectedBooking.student_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="font-medium text-gray-900">{selectedBooking.student_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">State</p>
                    <p className="font-medium text-gray-900">{selectedBooking.student_state || "-"}</p>
                  </div>
                </div>
              </section>

              {/* Order Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <CreditCard className="h-3 w-3" />
                  Order Details
                </h4>
                <div className="rounded-md border p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedBooking.product_name}</p>
                      <p className="text-xs text-gray-500">Course Name: {selectedBooking.course_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₹{selectedBooking.final_amount}</p>
                      <Badge variant={selectedBooking.payment_status === 'paid' ? 'default' : 'secondary'} className="capitalize mt-1">
                        {selectedBooking.payment_status}
                      </Badge>
                    </div>
                  </div>

                  {/* Payment Link Section */}
                  {selectedBooking.payment_link && (
                    <div className="pt-3 mt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-gray-500">Payment Link</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => copyToClipboard(selectedBooking.payment_link)}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" asChild>
                          <a href={selectedBooking.payment_link} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Footer Info */}
              <div className="pt-2 text-center text-xs text-gray-400">
                <p>Booking ID: {selectedBooking.booking_id}</p>
                <p>Date: {new Date(selectedBooking.booking_date).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Loading details...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}