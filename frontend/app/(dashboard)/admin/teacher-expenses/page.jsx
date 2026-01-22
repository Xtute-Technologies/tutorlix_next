'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { teacherExpenseAPI } from '@/lib/lmsService'; 
import SharedExpenseList from '@/components/SharedExpenseList';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import { authService } from '@/lib/authService';

// Zod Schema
const teacherExpenseSchema = z.object({
  teacher: z.string().min(1, 'Teacher selection is required'),
  amount: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

export default function TeacherExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [teachersList, setTeachersList] = useState([]); // List for dropdown
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    // Allow Admins and Teachers
    if (!['admin', 'teacher'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    
    fetchData();
    if (isAdmin) {
      fetchTeachers();
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await teacherExpenseAPI.getAll();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch expenses' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await authService.getAllUsers({ role: 'teacher' });
      const teachers = response.results || response.data;
      
      // Format for Dropdown [{value: id, label: name}]
      const formattedTeachers = teachers.map(u => ({
        value: u.id.toString(),
        label: `${u.first_name} ${u.last_name} (${u.email})`
      }));
      setTeachersList(formattedTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
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
        teacher: parseInt(data.teacher), // Ensure ID is int
      };

      if (editingExpense) {
        await teacherExpenseAPI.update(editingExpense.id, payload);
        setMessage({ type: 'success', text: 'Record updated successfully!' });
      } else {
        await teacherExpenseAPI.create(payload);
        setMessage({ type: 'success', text: 'Teacher expense recorded successfully!' });
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
      teacher: expense.teacher?.toString(), // For dropdown mapping
      date: expense.date || new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await teacherExpenseAPI.delete(id);
      setMessage({ type: 'success', text: 'Record deleted successfully' });
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  const formFields = useMemo(() => [
    {
      name: 'teacher',
      label: 'Select Teacher',
      type: 'select',
      options: teachersList,
      placeholder: 'Choose a teacher...',
      required: true,
      description: 'Select the teacher who receives this payment.',
    },
    {
      name: 'amount',
      label: 'Amount (₹)',
      type: 'number',
      placeholder: '0.00',
      required: true,
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      defaultValue: new Date().toISOString().split('T')[0],
    },
    {
      name: 'description',
      label: 'Description / Remarks',
      type: 'textarea',
      placeholder: 'E.g., Salary for Jan 2026',
    },
  ], [teachersList]);

  // Calculate Total (Client-side for now, can perform server-side if paginated)
  const totalAmount = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Expenses</h1>
          <p className="text-gray-600 mt-1">Manage salaries and payments to teachers.</p>
        </div>
        {(isAdmin) && (
          <Button onClick={() => { setEditingExpense(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-l-4 border-l-blue-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Total Paid Output</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          <span>{message.text}</span>
          <Button variant="ghost" size="sm" onClick={() => setMessage({ type: '', text: '' })}>Dismiss</Button>
        </div>
      )}

      <SharedExpenseList
        data={expenses}
        loading={loading}
        userRole={user?.role}
        onEdit={handleEdit}
        onDelete={handleDelete}
        entityType="teacher"
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Payment Record' : 'Record New Payment'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update the details of this transaction.' : 'Enter details of the payment made to the teacher.'}
            </DialogDescription>
          </DialogHeader>
          
          <FormBuilder
            schema={teacherExpenseSchema}
            fields={formFields}
            onSubmit={handleSubmit}
            defaultValues={editingExpense || { date: new Date().toISOString().split('T')[0] }}
            submitLabel={editingExpense ? 'Update Record' : 'Save Record'}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
