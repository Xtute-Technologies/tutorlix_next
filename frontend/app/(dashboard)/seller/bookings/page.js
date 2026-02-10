'use client';

import { useEffect, useState, useMemo } from 'react';
import { bookingAPI, sellerExpenseAPI } from '@/lib/lmsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Eye, ExternalLink, User, CreditCard, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import DataTable from '@/components/DataTable';
import CreateBookingForm from './CreateBookingForm';
import { useAuth } from '@/context/AuthContext';
import CopyButton from '@/components/ui/copy-button';
import { cn } from "@/lib/utils";

export default function SellerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [expireDialogOpen, setExpireDialogOpen] = useState(false);
  const [bookingToExpire, setBookingToExpire] = useState(null);
  const [expiring, setExpiring] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const paidHistories = useMemo(() => {
    return bookings.flatMap(b =>
      Array.isArray(b.payment_histories)
        ? b.payment_histories.filter(h => h.status === "paid")
        : []
    );
  }, [bookings]);

  const fetchData = async () => {
    try {
      setLoading(true);
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

  const handleExpireClick = (booking) => {
    setBookingToExpire(booking);
    setExpireDialogOpen(true);
  };

  const confirmExpire = async () => {
    if (!bookingToExpire) return;

    try {
      setExpiring(true);
      await bookingAPI.expirePaymentLink({
        booking_id: bookingToExpire.booking_id,
      });
      await fetchData();
      setExpireDialogOpen(false);
      setStudentDialogOpen(false);
    } catch (err) {
      console.error("Expire failed", err);
    } finally {
      setExpiring(false);
      setBookingToExpire(null);
    }
  };

  // --- CALCULATIONS ---
  const totalSales = useMemo(() => {
    return paidHistories.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);
  }, [paidHistories]);

  const totalReceived = useMemo(() => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [expenses]);

  const profitContribution = totalSales - totalReceived;
  const isProfitPositive = profitContribution >= 0;

  // --- HANDLERS ---
  const handleBookingSuccess = () => {
    fetchData();
    setIsCreateDialogOpen(false);
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
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-foreground">{row.original.student_name}</div>
            <div className="text-xs text-muted-foreground">{row.original?.student_email || "No email"}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate font-medium text-sm text-foreground/80" title={row.original.course_name}>
          {row.original.course_name}
        </div>
      ),
    },
    {
      accessorKey: 'final_amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-bold text-foreground">
          ₹{parseFloat(row.original.final_amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.payment_status;
        let variant = "outline";
        let className = "capitalize font-bold border-transparent";

        switch (status) {
            case 'paid':
                className += " bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                break;
            case 'pending':
                className += " bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
                break;
            case 'failed':
                className += " bg-destructive/10 text-destructive border-destructive/20";
                break;
            case 'expired':
                className += " bg-muted text-muted-foreground";
                variant = "secondary";
                break;
            default:
                className += " bg-muted text-muted-foreground";
        }

        return <Badge variant={variant} className={className}>{status}</Badge>;
      },
    },
    {
      id: "payment_link",
      header: "Link",
      cell: ({ row }) => (
        row.original.payment_link ? (
          <CopyButton text={row.original.payment_link} />
        ) : <span className="text-muted-foreground text-xs italic">N/A</span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => handleViewStudent(row.original)}
        >
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-8">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Booking Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage enrollments and track your financial performance.</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20 font-bold">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>Generate a secure payment link for a new student enrollment.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <CreateBookingForm onSuccess={handleBookingSuccess} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- PROMINENT STATS BOXES --- */}
      {user?.role === "seller" &&
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* BOX 1: PROFIT CONTRIBUTION */}
          <Card className={cn(
              "border-none shadow-xl relative overflow-hidden",
              isProfitPositive ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="h-32 w-32 transform translate-x-8 -translate-y-8" />
            </div>
            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full min-h-[140px]">
              <div>
                <span className="opacity-90 font-bold text-xs tracking-widest uppercase">Net Contribution</span>
                <div className="text-4xl font-black tracking-tight mt-1">
                  {isProfitPositive ? '+' : '-'}₹{Math.abs(profitContribution).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium opacity-80">
                {isProfitPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>Total Profit (Sales - Payouts)</span>
              </div>
            </CardContent>
          </Card>

          {/* BOX 2: MONEY RECEIVED (Payouts) */}
          <Card className="shadow-md border-border bg-card">
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex justify-between items-start">
                  <div>
                    <span className="text-muted-foreground font-bold text-xs tracking-widest uppercase">Money Received</span>
                    <div className="text-3xl font-black tracking-tight mt-1 text-foreground">
                        ₹{totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="p-2 bg-muted rounded-full">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground font-medium">
                 Total payouts & commissions received
              </div>
            </CardContent>
          </Card>

          {/* BOX 3: SALES MADE */}
          <Card className="shadow-md border-border bg-card">
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[140px]">
              <div className="flex justify-between items-start">
                  <div>
                    <span className="text-muted-foreground font-bold text-xs tracking-widest uppercase">Total Sales</span>
                    <div className="text-3xl font-black tracking-tight mt-1 text-foreground">
                        ₹{totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-full">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
              </div>
              <div className="mt-4 text-xs text-emerald-600 font-bold">
                 Gross value of confirmed bookings
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* RECENT BOOKINGS TABLE */}
      <Card className="border-border shadow-sm">
        <div className="p-6 border-b border-border bg-muted/20">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
             Bookings History
          </h3>
        </div>
        <div className="p-0">
            <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                searchKey="student_name"
                searchPlaceholder="Search student name..."
            />
        </div>
      </Card>

      {/* VIEW DETAILS DIALOG */}
      <Dialog
        open={studentDialogOpen}
        onOpenChange={(open) => {
          setStudentDialogOpen(open);
          if (!open) setSelectedBooking(null);
        }}
      >
        <DialogContent className="sm:max-w-xl bg-background border-border">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking ? (
            <div className="space-y-6 py-2 text-sm">
              {/* Student Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <User className="h-3 w-3" /> Student Information
                </h4>
                <div className="rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Full Name</p>
                    <p className="font-medium text-foreground">{selectedBooking.student_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Email</p>
                    <p className="font-medium text-foreground truncate" title={selectedBooking.student_email}>{selectedBooking.student_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide">Phone</p>
                    <p className="font-medium text-foreground">{selectedBooking.student_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wide">State</p>
                    <p className="font-medium text-foreground">{selectedBooking.student_state || "-"}</p>
                  </div>
                </div>
              </section>

              {/* Order Section */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CreditCard className="h-3 w-3" /> Order Details
                </h4>
                <div className="rounded-xl border border-border p-0 overflow-hidden">
                  <div className="p-4 bg-card flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{selectedBooking.product_name}</p>
                      <p className="text-xs text-muted-foreground">Course: {selectedBooking.course_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-foreground">₹{selectedBooking.final_amount}</p>
                      <Badge variant="outline" className="mt-1 capitalize text-[10px]">{selectedBooking.payment_status}</Badge>
                    </div>
                  </div>

                  {/* Payment Link Section */}
                  {selectedBooking.payment_link && (
                    <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Payment Link</span>
                      <div className="flex gap-2 items-center">
                        <CopyButton text={selectedBooking.payment_link} className="h-7 text-xs" />
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={selectedBooking.payment_link} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> Open
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleExpireClick(selectedBooking)}
                        >
                          Expire
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* PAYMENT HISTORY */}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Transaction History
                </h4>

                {Array.isArray(selectedBooking.payment_histories) && selectedBooking.payment_histories.length > 0 ? (
                  <div className="rounded-xl border border-border divide-y divide-border bg-card">
                    {[...selectedBooking.payment_histories]
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground">₹{p.amount}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                            {p.razorpay_payment_id && (
                              <div className="text-[10px] font-mono text-muted-foreground/70">ID: {p.razorpay_payment_id}</div>
                            )}
                          </div>
                          <Badge variant="outline" className={cn(
                              "capitalize text-[10px] font-bold border-transparent",
                              p.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                              p.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600"
                          )}>
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center">
                    No payment attempts recorded yet.
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Loading details...</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={expireDialogOpen} onOpenChange={setExpireDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border">
          <div className="flex items-start gap-4 p-6 border-b border-border bg-destructive/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <ExternalLink className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground">Expire payment link?</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This will permanently disable the payment link for this student.
              </DialogDescription>
            </div>
          </div>
          <div className="flex justify-end gap-3 bg-muted/20 px-6 py-4">
            <Button variant="outline" onClick={() => setExpireDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmExpire} disabled={expiring}>
              {expiring ? "Expiring..." : "Yes, Expire Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}