'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
// import { useToast } from "@/hooks/use-toast"
import { Copy, Plus, RefreshCw, ShoppingCart, User } from 'lucide-react';
import DataTable from '@/components/DataTable';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    email: '',
    phone: '',
    state: '',
    password: '',
    product: '',
    coupon_code: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, productsRes] = await Promise.all([
        bookingAPI.getAll({ ordering: '-booking_date' }),
        productAPI.getAll({ is_active: true })
      ]);
      setBookings(bookingsRes);
      setProducts(productsRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value) => {
    setFormData({ ...formData, product: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: '', text: '' });
    
    try {
      await bookingAPI.sellerCreate(formData);
      setMessage({ type: 'success', text: 'Booking created and payment link generated!' });
      setFormData({
        student_name: '',
        email: '',
        phone: '',
        state: '',
        password: '',
        product: '',
        coupon_code: ''
      });
      fetchData(); // Refresh list
    } catch (error) {
      const errorMsg = error.response?.data?.detail 
        || Object.entries(error.response?.data || {}).map(([key, val]) => `${key}: ${val}`).join(', ')
        || 'Failed to create booking';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here
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
        const variants = {
          paid: 'success', // Assuming you have variants mapped or just use classes
          pending: 'warning',
          failed: 'destructive',
        };
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
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-1">Create bookings and manage student enrollments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Booking Form */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>New Booking</CardTitle>
            <CardDescription>Enter student details to generate payment link</CardDescription>
          </CardHeader>
          <CardContent>
            {message.text && (
                <div className={`p-3 rounded-md mb-4 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student_name">Student Name *</Label>
                <Input 
                    id="student_name" 
                    name="student_name" 
                    value={formData.student_name} 
                    onChange={handleChange} 
                    required 
                    placeholder="John Doe" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    placeholder="student@example.com" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone / WhatsApp</Label>
                <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="+91 9876543210" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                    id="state" 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    placeholder="Maharashtra" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input 
                    id="password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    placeholder="Secure password for student login" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Course *</Label>
                <Select value={formData.product} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} (₹{p.price})
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon_code">Coupon Code</Label>
                <Input 
                    id="coupon_code" 
                    name="coupon_code" 
                    value={formData.coupon_code} 
                    onChange={handleChange} 
                    placeholder="OFFER20" 
                />
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Generating Link..." : "Create Booking & Payment Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Bookings List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
                Track status of your generated links
            </CardDescription>
          </CardHeader>
          <CardContent>
             <DataTable 
                columns={columns} 
                data={bookings} 
                loading={loading}
                searchKey="student_name"
             />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
