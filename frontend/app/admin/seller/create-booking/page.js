'use client';

import { useEffect, useState } from 'react';
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateBookingPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsRes = await productAPI.getAll({ is_active: true });
      setProducts(productsRes);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
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
      setMessage({ type: 'success', text: 'Booking created successfully! Payment link generated.' });
      setFormData({
        student_name: '',
        email: '',
        phone: '',
        state: '',
        password: '',
        product: '',
        coupon_code: ''
      });
    } catch (error) {
      const errorMsg = error.response?.data?.detail 
        || Object.entries(error.response?.data || {}).map(([key, val]) => `${key}: ${val}`).join(', ')
        || 'Failed to create booking';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/seller/bookings">
           <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
           </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Booking</h1>
          <p className="text-gray-600 mt-1">Create a new student enrollment</p>
        </div>
      </div>

      <Card className={"max-w-3xl"}>
          <CardContent className="pt-6">
            {message.text && (
                <div className={`p-4 rounded-md mb-6 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input 
                    id="password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    placeholder="Set password for student login" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Course *</Label>
                    <Select value={formData.product} onValueChange={handleSelectChange}>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingProducts ? "Loading courses..." : "Select Course"} />
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
              </div>

              <div className="pt-4">
                 <Button type="submit" size="lg" className="w-full" disabled={creating}>
                    {creating ? "Processing..." : "Create Booking & Generate Link"}
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
