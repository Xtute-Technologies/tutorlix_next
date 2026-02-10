'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  bookingAPI, 
  expenseAPI, 
  productAPI, 
  categoryAPI, 
  sellerExpenseAPI 
} from '@/lib/lmsService';
import {
  Package,
  Tag,
  ShoppingCart,
  DollarSign,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalBookings: 0,
    paidBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalGeneralExpenses: 0,
    totalSellerExpenses: 0,
    totalSales: 0,
    successfulPayments: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        productsRes,
        categoriesRes,
        bookingStatsRes,
        expenseSummaryRes,
        sellerExpenseSummaryRes,
        recentBookingsRes,
      ] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
        bookingAPI.getStatistics(),
        expenseAPI.getSummary(),
        sellerExpenseAPI.getSummary(),
        bookingAPI.getAll({ ordering: '-booking_date' }),
      ]);

      setStats({
        totalProducts: productsRes.length || 0,
        totalCategories: categoriesRes.length || 0,
        totalBookings: bookingStatsRes.total_bookings || 0,
        paidBookings: bookingStatsRes.paid_bookings || 0,
        pendingBookings: bookingStatsRes.pending_bookings || 0,
        totalSales: bookingStatsRes.total_sales || 0,
        totalRevenue: parseFloat(bookingStatsRes.total_revenue || 0),
        successfulPayments: bookingStatsRes.successful_payments || 0, 
        totalGeneralExpenses: parseFloat(expenseSummaryRes.total_expenses || expenseSummaryRes.total || 0),
        totalSellerExpenses: parseFloat(sellerExpenseSummaryRes.total_amount || 0),
      });
      setRecentBookings(recentBookingsRes.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = stats.totalGeneralExpenses + stats.totalSellerExpenses;
  const netProfit = stats.totalRevenue - totalExpenses;
  const isProfitPositive = netProfit >= 0;

  const getPaymentStatusBadge = (status) => {
    const variants = {
      paid: 'bg-primary text-primary-foreground border-transparent',
      pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
      refunded: 'bg-muted text-muted-foreground border-transparent',
    };
    return variants[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of Tutorlix performance.</p>
      </div>

      {/* --- FINANCIAL OVERVIEW (Top Row) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. NET PROFIT CARD (Themed Accent) */}
        <Card className={`border-none shadow-xl relative overflow-hidden ${isProfitPositive ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
           <div className="absolute top-0 right-0 p-4 opacity-15">
             <DollarSign className="h-32 w-32 transform translate-x-8 -translate-y-8" />
           </div>
           <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
             <div>
               <p className="text-primary-foreground/80 font-medium text-xs tracking-widest uppercase">Net Profit</p>
               <h2 className="text-4xl font-black mt-2">
                 {isProfitPositive ? '+' : '-'}₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h2>
             </div>
             <div className="mt-6 pt-4 border-t border-primary-foreground/20 flex justify-between items-center text-sm">
               <span className="text-primary-foreground/70">Total Revenue</span>
               <span className="font-bold">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
             </div>
           </CardContent>
        </Card>

        {/* 2. EXPENSES BREAKDOWN CARD */}
        <Card className="shadow-md border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground mb-4">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-background rounded-lg border shadow-sm">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">General Ops</span>
                </div>
                <span className="text-sm font-bold">₹{stats.totalGeneralExpenses.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-background rounded-lg border shadow-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Seller Payouts</span>
                </div>
                <span className="text-sm font-bold">₹{stats.totalSellerExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. SALES SUMMARY CARD */}
        <Card className="shadow-md border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Sales Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-4">
               <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSales}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Sales</p>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Bookings</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase">Paid</span>
                </div>
                <span className="text-xl font-bold">{stats.successfulPayments}</span>
              </div>

              <div className="flex flex-col p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase">Pending</span>
                </div>
                <span className="text-xl font-bold">{stats.pendingBookings}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SECONDARY STATS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-2xl border">
              <Package className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Products</p>
              <p className="text-2xl font-black text-foreground">{stats.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 bg-muted rounded-2xl border">
              <Tag className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Categories</p>
              <p className="text-2xl font-black text-foreground">{stats.totalCategories}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- RECENT BOOKINGS --- */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No bookings yet</p>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-black shrink-0 shadow-sm">
                      {booking.student_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{booking.student_name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{booking.course_name}</p>
                      <p className="text-[10px] text-muted-foreground sm:hidden uppercase font-bold mt-1">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="hidden sm:block text-right">
                       <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {new Date(booking.booking_date).toLocaleDateString()}
                       </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="font-black text-foreground text-lg">
                        ₹{parseFloat(booking.final_amount).toLocaleString('en-IN')}
                      </p>
                      <Badge className={`mt-1 border shadow-none px-2 py-0 h-5 text-[9px] font-black uppercase ${getPaymentStatusBadge(booking.payment_status)}`}>
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}