'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sellerExpenseAPI } from '@/lib/lmsService'; // Import the new API
import axiosInstance from '@/lib/axios'; // Direct axios for fetching users list

import SellerExpenseList from '@/components/seller/SellerExpenseList'; // Import the reusable component
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import { authService } from '@/lib/authService';

// Zod Schema
const sellerExpenseSchema = z.object({
  seller: z.string().min(1, 'Seller selection is required'),
  amount: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

export default function SellerExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [sellersList, setSellersList] = useState([]); // List for dropdown
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    // Allow Admins and Sellers
    if (!['admin', 'seller'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    
    fetchData();
    if (isAdmin) {
      fetchSellers();
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await sellerExpenseAPI.getAll();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch expenses' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    try {
      // Assuming you have an endpoint to get users by role
      // Adjust endpoint based on your actual User ViewSet
      const response = await authService.getAllUsers({ role: 'seller' });
      const sellers = response.results || response.data;
      
      // Format for Dropdown [{value: id, label: name}]
      const formattedSellers = sellers.map(u => ({
        value: u.id.toString(),
        label: `${u.first_name} ${u.last_name} (${u.email})`
      }));
      setSellersList(formattedSellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const handleSubmit = async (data) => {
    if (!isAdmin) return; // Guard clause

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        seller: parseInt(data.seller), // Ensure ID is int
      };

      if (editingExpense) {
        await sellerExpenseAPI.update(editingExpense.id, payload);
        setMessage({ type: 'success', text: 'Record updated successfully!' });
      } else {
        await sellerExpenseAPI.create(payload);
        setMessage({ type: 'success', text: 'Seller expense recorded successfully!' });
      }

      setShowForm(false);
      setEditingExpense(null);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save record',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense({
      ...expense,
      amount: expense.amount?.toString(),
      seller: expense.seller?.toString(), // For dropdown mapping
      date: expense.date || new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await sellerExpenseAPI.delete(id);
      setMessage({ type: 'success', text: 'Record deleted successfully' });
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  const formFields = useMemo(() => [
    {
      name: 'seller',
      label: 'Select Seller',
      type: 'select',
      options: sellersList,
      placeholder: 'Choose a seller...',
      required: true,
    },
    {
      name: 'amount',
      label: 'Amount Given',
      type: 'number',
      placeholder: 'e.g., 5000',
      required: true,
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
    },
    {
      name: 'description',
      label: 'Description / Reason',
      type: 'textarea',
      placeholder: 'e.g., Monthly commission advance',
    },
  ], [sellersList]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seller Disbursements</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Track money given to sellers' 
              : 'View your received payments/expenses'}
          </p>
        </div>
        
        {/* Only Admin can add new expenses */}
        {isAdmin && (
          <Button onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium mb-1">Total Disbursed</p>
            <p className="text-3xl font-bold text-blue-900">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-3 rounded-full shadow-sm">
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <p className="text-sm text-blue-600 mt-2">
          Across {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
        </p>
      </Card>

      {/* Reusable List Component */}
      <SellerExpenseList 
        data={expenses} 
        loading={loading}
        userRole={user?.role}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Dialog for Form (Admin Only) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Payment Record' : 'Record New Payment'}
            </DialogTitle>
            <DialogDescription>
              Details of money given to seller.
            </DialogDescription>
          </DialogHeader>
          
          <FormBuilder
            fields={formFields}
            defaultValues={editingExpense}
            validationSchema={sellerExpenseSchema}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            submitLabel={editingExpense ? 'Update Record' : 'Save Record'}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}