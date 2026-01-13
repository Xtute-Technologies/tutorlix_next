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
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight
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
  });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
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
        
        // Booking Stats
        totalBookings: bookingStatsRes.total_bookings || 0,
        paidBookings: bookingStatsRes.paid_bookings || 0,
        pendingBookings: bookingStatsRes.pending_bookings || 0,
        totalRevenue: parseFloat(bookingStatsRes.total_revenue || 0),
        
        // Expense Stats (Handling different API response structures safely)
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
      paid: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200',
      failed: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of Tutorlix performance.</p>
      </div>

      {/* --- FINANCIAL OVERVIEW (Top Row) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. NET PROFIT CARD */}
        <Card className={`border-0 shadow-lg ${isProfitPositive ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-gradient-to-br from-gray-700 to-gray-800'} text-white relative overflow-hidden`}>
           <div className="absolute top-0 right-0 p-4 opacity-10">
             <DollarSign className="h-32 w-32 transform translate-x-8 -translate-y-8" />
           </div>
           <CardContent className="p-6 flex flex-col justify-between h-full">
             <div>
               <p className="text-indigo-100 font-medium text-sm tracking-wide uppercase">Net Profit</p>
               <h2 className="text-4xl font-bold mt-2">
                 {isProfitPositive ? '+' : '-'}₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </h2>
             </div>
             <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-sm text-indigo-100">
               <span>Total Revenue</span>
               <span className="font-semibold text-white">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
             </div>
           </CardContent>
        </Card>

        {/* 2. EXPENSES BREAKDOWN CARD */}
        <Card className="shadow-md border-red-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">General Ops</span>
                </div>
                <span className="text-sm font-bold text-gray-900">₹{stats.totalGeneralExpenses.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Seller Payouts</span>
                </div>
                <span className="text-sm font-bold text-gray-900">₹{stats.totalSellerExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. BOOKINGS SUMMARY CARD (Consolidated) */}
        <Card className="shadow-md border-blue-100 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              Bookings Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {stats.totalBookings} <span className="text-sm font-normal text-gray-500">Total Orders</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Paid</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.paidBookings}</span>
              </div>

              <div className="flex flex-col p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-2 text-yellow-700 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Pending</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SECONDARY STATS (Products/Cats) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
             <div className="p-3 bg-purple-50 rounded-full">
              <Tag className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- RECENT BOOKINGS TABLE --- */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No bookings yet</p>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                      {booking.student_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.student_name}</p>
                      <p className="text-sm text-gray-500">{booking.course_name}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{new Date(booking.booking_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className="hidden sm:block text-right">
                       <p className="text-xs text-gray-400 mb-1">{new Date(booking.booking_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{parseFloat(booking.final_amount).toLocaleString('en-IN')}</p>
                      <Badge className={`mt-1 border capitalize ${getPaymentStatusBadge(booking.payment_status)}`}>
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