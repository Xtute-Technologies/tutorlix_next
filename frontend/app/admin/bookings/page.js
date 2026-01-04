'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bookingAPI, productAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Trash2, Edit, ShoppingCart, Eye, DollarSign } from 'lucide-react';
import { z } from 'zod';

const bookingSchema = z.object({
  student: z.number().min(1, 'Student is required'),
  product: z.number().min(1, 'Product is required'),
  course_name: z.string().min(1, 'Course name is required'),
  price: z.string().min(1, 'Price is required'),
  coupon_code: z.number().optional(),
  payment_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  payment_status: z.string(),
  student_status: z.string(),
  booked_by: z.string().min(1, 'Booked by is required'),
  payment_date: z.string().optional().or(z.literal('')),
  course_expiry_date: z.string().optional().or(z.literal('')),
});

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsData, studentsData, productsData, sellersData] = await Promise.all([
        bookingAPI.getAll(),
        authService.getAllUsers('student'),
        productAPI.getAll(),
        authService.getAllUsers('seller'),
      ]);

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setSellers(Array.isArray(sellersData?.results) ? sellersData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setBookings([]);
      setStudents([]);
      setProducts([]);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const payload = {
        ...data,
        price: parseFloat(data.price),
        student: parseInt(data.student),
        product: parseInt(data.product),
        sales_representative: data.sales_representative ? parseInt(data.sales_representative) : null,
        coupon_code: data.coupon_code || null,
        payment_date: data.payment_date || null,
        course_expiry_date: data.course_expiry_date || null,
      };

      if (editingId) {
        await bookingAPI.update(editingId, payload);
        setMessage({ type: 'success', text: 'Booking updated successfully!' });
      } else {
        await bookingAPI.create(payload);
        setMessage({ type: 'success', text: 'Booking created successfully!' });
      }

      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save booking',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (booking) => {
    setEditingId(booking.id);
    setShowForm(true);
  };

  const handleView = (booking) => {
    setSelectedBooking(booking);
    setShowViewDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      await bookingAPI.delete(id);
      setMessage({ type: 'success', text: 'Booking deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete booking',
      });
    }
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-600',
      paid: 'bg-green-600',
      failed: 'bg-red-600',
      refunded: 'bg-gray-600',
    };
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStudentStatusBadge = (status) => {
    const variants = {
      in_process: 'bg-blue-600',
      active: 'bg-green-600',
      inactive: 'bg-gray-600',
      completed: 'bg-purple-600',
      cancelled: 'bg-red-600',
    };
    const labels = {
      in_process: 'In Process',
      active: 'Active',
      inactive: 'Inactive',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formFields = [
    {
      name: 'student',
      label: 'Student',
      type: 'select',
      required: true,
      options: students.map(s => ({ value: s.id, label: `${s.full_name} (${s.email})` })),
    },
    {
      name: 'product',
      label: 'Product',
      type: 'select',
      required: true,
      options: products.map(p => ({ value: p.id, label: p.name })),
    },
    {
      name: 'course_name',
      label: 'Course Name',
      type: 'text',
      required: true,
      placeholder: 'Enter course name',
    },
    {
      name: 'price',
      label: 'Price',
      type: 'number',
      required: true,
      placeholder: '0.00',
    },
    {
      name: 'payment_status',
      label: 'Payment Status',
      type: 'select',
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' },
        { value: 'refunded', label: 'Refunded' },
      ],
    },
    {
      name: 'student_status',
      label: 'Student Status',
      type: 'select',
      required: true,
      options: [
        { value: 'in_process', label: 'In Process' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      name: 'sales_representative',
      label: 'Sales Representative',
      type: 'select',
      required: false,
      options: sellers.map(s => ({ value: s.id, label: s.full_name })),
    },
    {
      name: 'booked_by',
      label: 'Booked By',
      type: 'text',
      required: true,
      placeholder: 'Name of person who created booking',
    },
    {
      name: 'payment_link',
      label: 'Payment Link',
      type: 'url',
      required: false,
      placeholder: 'https://payment.example.com/...',
    },
    {
      name: 'payment_date',
      label: 'Payment Date',
      type: 'date',
      required: false,
    },
    {
      name: 'course_expiry_date',
      label: 'Course Expiry Date',
      type: 'date',
      required: false,
    },
  ];

  const defaultValues = editingId
    ? {
        ...bookings.find(b => b.id === editingId),
        student: bookings.find(b => b.id === editingId)?.student,
        product: bookings.find(b => b.id === editingId)?.product,
        sales_representative: bookings.find(b => b.id === editingId)?.sales_representative || '',
        payment_date: bookings.find(b => b.id === editingId)?.payment_date?.split('T')[0] || '',
        course_expiry_date: bookings.find(b => b.id === editingId)?.course_expiry_date || '',
      }
    : {
        payment_status: 'pending',
        student_status: 'in_process',
      };

  const columns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.original.student_name}</div>
            <div className="text-sm text-gray-600">{row.original.student_email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.course_name}</div>
          <div className="text-sm text-gray-600">{row.original.product_name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'final_amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">₹{parseFloat(row.original.final_amount).toFixed(2)}</div>
          {row.original.discount_amount > 0 && (
            <div className="text-sm text-green-600">
              -₹{parseFloat(row.original.discount_amount).toFixed(2)} off
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => getPaymentStatusBadge(row.original.payment_status),
    },
    {
      accessorKey: 'student_status',
      header: 'Status',
      cell: ({ row }) => getStudentStatusBadge(row.original.student_status),
    },
    {
      accessorKey: 'booking_date',
      header: 'Booked On',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.booking_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate total revenue
  const totalRevenue = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + parseFloat(b.final_amount), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Bookings</h1>
            <p className="text-gray-600 mt-1">Manage student course bookings and payments</p>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </div>

        {message.text && (
          <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message.text}
          </Card>
        )}

        {/* Revenue Card */}
        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Revenue (Paid)</p>
              <p className="text-3xl font-bold mt-1">₹{totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-200" />
          </div>
        </Card>

          <DataTable
            columns={columns}
            data={bookings}
            loading={loading}
            searchKey="student_name"
            searchPlaceholder="Search by student name..."
          />

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Booking' : 'Add New Booking'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update booking details' : 'Create a new course booking'}
              </DialogDescription>
            </DialogHeader>
            <FormBuilder
              fields={formFields}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              submitLabel={editingId ? 'Update' : 'Create'}
              submitting={submitting}
              schema={bookingSchema}
            />
          </DialogContent>
        </Dialog>

        {/* View Booking Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Booking ID: {selectedBooking?.id}
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">
                {/* Student Info */}
                <Card className="p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3">Student Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedBooking.student_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium">{selectedBooking.student_email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium">{selectedBooking.student_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">State:</span>
                      <span className="ml-2 font-medium">{selectedBooking.student_state || 'N/A'}</span>
                    </div>
                  </div>
                </Card>

                {/* Course Info */}
                <Card className="p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3">Course Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Course Name:</span>
                      <span className="ml-2 font-medium">{selectedBooking.course_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Product:</span>
                      <span className="ml-2 font-medium">{selectedBooking.product_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="ml-2 font-medium">₹{parseFloat(selectedBooking.price).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Discount:</span>
                      <span className="ml-2 font-medium text-green-600">
                        -₹{parseFloat(selectedBooking.discount_amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Final Amount:</span>
                      <span className="ml-2 font-bold text-lg">₹{parseFloat(selectedBooking.final_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </Card>

                {/* Payment & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Payment Status</h3>
                    <div className="space-y-2">
                      {getPaymentStatusBadge(selectedBooking.payment_status)}
                      {selectedBooking.payment_date && (
                        <p className="text-sm text-gray-600">
                          Paid on: {new Date(selectedBooking.payment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Student Status</h3>
                    {getStudentStatusBadge(selectedBooking.student_status)}
                  </Card>
                </div>

                {/* Additional Info */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Booked By:</span>
                      <span className="ml-2 font-medium">{selectedBooking.booked_by}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sales Rep:</span>
                      <span className="ml-2 font-medium">{selectedBooking.sales_rep_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Booking Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedBooking.booking_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="ml-2 font-medium">
                        {selectedBooking.course_expiry_date
                          ? new Date(selectedBooking.course_expiry_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {selectedBooking.payment_link && (
                    <div className="mt-3">
                      <span className="text-gray-600">Payment Link:</span>
                      <a
                        href={selectedBooking.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        View Payment
                      </a>
                    </div>
                  )}
                </Card>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowViewDialog(false);
                    handleEdit(selectedBooking);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
