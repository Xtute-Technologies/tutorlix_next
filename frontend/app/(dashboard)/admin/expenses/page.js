'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { expenseAPI } from '@/lib/lmsService';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { z } from 'zod';

const expenseSchema = z.object({
  name: z.string().min(1, 'Expense name is required'),
  amount: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

export default function ExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
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
      const expensesData = await expenseAPI.getAll();
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch expenses' });
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const expenseData = {
        ...data,
        amount: parseFloat(data.amount),
      };

      if (editingExpense) {
        await expenseAPI.update(editingExpense.id, expenseData);
        setMessage({ type: 'success', text: 'Expense updated successfully!' });
      } else {
        await expenseAPI.create(expenseData);
        setMessage({ type: 'success', text: 'Expense created successfully!' });
      }

      setShowForm(false);
      setEditingExpense(null);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save expense',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (expense) => {
    try {
      const fullExpense = await expenseAPI.getById(expense.id);
      setEditingExpense({
        ...fullExpense,
        amount: fullExpense.amount?.toString() || '',
        date: fullExpense.date || new Date().toISOString().split('T')[0],
      });
      setShowForm(true);
    } catch (error) {
      console.error('Error fetching expense details:', error);
      setMessage({ type: 'error', text: 'Failed to load expense details' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await expenseAPI.delete(id);
      setMessage({ type: 'success', text: 'Expense deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete expense',
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const expenseFields = useMemo(() => [
    {
      name: 'name',
      label: 'Expense Name',
      type: 'text',
      placeholder: 'e.g., Office Supplies',
      required: true,
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      placeholder: 'e.g., 1500.00',
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
      label: 'Description',
      type: 'textarea',
      placeholder: 'Additional details about the expense',
    },
  ], []);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  }, [expenses]);

  const columns = [
    {
      accessorKey: 'name',
      header: 'Expense Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <div className="font-medium">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="font-semibold text-green-600">
          ₹{parseFloat(row.original.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'created_by_name',
      header: 'Created By',
      cell: ({ row }) => (
        row.original.created_by_name || <span className="text-gray-400">N/A</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.description ? (
            row.original.description.length > 50
              ? `${row.original.description.substring(0, 50)}...`
              : row.original.description
          ) : (
            <span className="text-gray-400">No description</span>
          )}
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
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
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

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-gray-600 mt-1">Track and manage business expenses</p>
          </div>
          <Button onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {message.text && (
          <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message.text}
          </Card>
        )}

        {/* Total Expenses Summary */}
        <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900">
                ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-3 rounded-full">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Total of {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </Card>

          <DataTable
            columns={columns}
            data={expenses}
            loading={loading}
            searchKey="name"
            searchPlaceholder="Search by expense name..."
          />

        {/* Add/Edit Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? 'Update expense details'
                  : 'Record a new business expense'}
              </DialogDescription>
            </DialogHeader>
            <FormBuilder
              fields={expenseFields}
              defaultValues={editingExpense}
              validationSchema={expenseSchema}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel={editingExpense ? 'Update Expense' : 'Create Expense'}
              isSubmitting={submitting}
            />
          </DialogContent>
        </Dialog>
      </div>
    
  );
}
