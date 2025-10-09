'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { bookingAPI, expenseAPI, productAPI, categoryAPI } from '@/lib/lmsService';
import {
  Package,
  Tag,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
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
    totalExpenses: 0,
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
        recentBookingsRes,
      ] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
        bookingAPI.getStatistics(),
        expenseAPI.getSummary(),
        bookingAPI.getAll({ ordering: '-booking_date' }),
      ]);

      setStats({
        totalProducts: productsRes.length || 0,
        totalCategories: categoriesRes.length || 0,
        totalBookings: bookingStatsRes.total_bookings || 0,
        paidBookings: bookingStatsRes.paid_bookings || 0,
        pendingBookings: bookingStatsRes.pending_bookings || 0,
        totalRevenue: bookingStatsRes.total_revenue || 0,
        totalExpenses: expenseSummaryRes.total_expenses || 0,
      });

      setRecentBookings(recentBookingsRes.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: Tag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pending Bookings',
      value: stats.pendingBookings,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Expenses',
      value: `₹${stats.totalExpenses.toLocaleString('en-IN')}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const getPaymentStatusBadge = (status) => {
    const variants = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Tutorlix Admin Panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Net Profit Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90 mb-1">Net Profit</p>
                <p className="text-3xl font-bold">
                  ₹{(stats.totalRevenue - stats.totalExpenses).toLocaleString('en-IN')}
                </p>
                <p className="text-sm opacity-75 mt-2">
                  Revenue: ₹{stats.totalRevenue.toLocaleString('en-IN')} - Expenses: ₹{stats.totalExpenses.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {booking.student_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.student_name}</p>
                        <p className="text-sm text-gray-500">{booking.course_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{booking.final_amount}</p>
                      <Badge className={`mt-1 ${getPaymentStatusBadge(booking.payment_status)}`}>
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
