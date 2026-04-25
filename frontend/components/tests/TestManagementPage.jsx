'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { productAPI, testAPI } from '@/lib/lmsService';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const testSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  product: z.string().min(1, 'Course is required'),
  status: z.string().min(1, 'Status is required'),
  duration_minutes: z.string().min(1, 'Duration is required'),
  instructions: z.string().optional(),
  description: z.string().optional(),
  available_from: z.string().optional(),
  available_until: z.string().optional(),
  lock_on_window_blur: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function TestManagementPage({ role }) {
  const router = useRouter();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== role) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [role, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const productParams = role === 'teacher' ? { my_products: 'true', is_active: true } : { is_active: true };
      const [testsData, productsData] = await Promise.all([
        testAPI.getAll(),
        productAPI.getAll(productParams),
      ]);
      setTests(Array.isArray(testsData) ? testsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Failed to fetch tests', error);
      setMessage({ type: 'error', text: 'Failed to fetch tests.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const payload = {
        title: data.title,
        product: Number(data.product),
        status: data.status,
        duration_minutes: Number(data.duration_minutes),
        instructions: data.instructions || '',
        description: data.description || '',
        available_from: data.available_from || null,
        available_until: data.available_until || null,
        lock_on_window_blur: !!data.lock_on_window_blur,
        is_active: data.is_active !== false,
      };

      if (editingTest) {
        await testAPI.update(editingTest.id, payload);
        setMessage({ type: 'success', text: 'Test updated successfully.' });
      } else {
        await testAPI.create(payload);
        setMessage({ type: 'success', text: 'Test created successfully.' });
      }

      setShowForm(false);
      setEditingTest(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save test', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save test.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingTest({
      ...item,
      product: item.product?.toString(),
      duration_minutes: item.duration_minutes?.toString() || '60',
      available_from: toDateTimeLocal(item.available_from),
      available_until: toDateTimeLocal(item.available_until),
      lock_on_window_blur: item.lock_on_window_blur,
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this test?')) return;
    try {
      await testAPI.delete(id);
      setMessage({ type: 'success', text: 'Test deleted successfully.' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete test', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete test.' });
    }
  };

  const handleBulkDelete = async (rows) => {
    const results = await Promise.allSettled(rows.map((row) => testAPI.delete(row.id)));
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    setMessage(
      failedCount > 0
        ? { type: 'error', text: `${failedCount} test(s) could not be deleted.` }
        : { type: 'success', text: `${rows.length} test(s) deleted successfully.` }
    );
    fetchData();
  };

  const fields = useMemo(() => [
    {
      name: 'title',
      label: 'Test Title',
      type: 'text',
      placeholder: 'e.g. Unit Test 1',
      required: true,
    },
    {
      name: 'product',
      label: 'Course',
      type: 'select',
      placeholder: 'Select course',
      options: products.map((product) => ({ label: product.name, value: product.id.toString() })),
      required: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
    },
    {
      name: 'duration_minutes',
      label: 'Duration (minutes)',
      type: 'number',
      placeholder: '60',
      required: true,
    },
    {
      name: 'available_from',
      label: 'Available From',
      type: 'datetime-local',
    },
    {
      name: 'available_until',
      label: 'Available Until',
      type: 'datetime-local',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 3,
    },
    {
      name: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      rows: 4,
    },
    {
      name: 'lock_on_window_blur',
      label: 'Lock On Window Switch',
      type: 'checkbox',
      placeholder: 'Lock this test if the student changes tab or window',
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      placeholder: 'Test is active',
    },
  ], [products]);

  const basePath = role === 'admin' ? '/admin/test-scores' : '/teacher/test-scores';
  const columns = [
    {
      accessorKey: 'title',
      header: 'Test',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-gray-500">{row.original.product_name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'published' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'question_count',
      header: 'Questions',
    },
    {
      accessorKey: 'locked_attempt_count',
      header: 'Locked',
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Duration',
      cell: ({ row }) => `${row.original.duration_minutes} min`,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/${row.original.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(row.original.id)}>
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
          <h1 className="text-3xl font-bold">Tests</h1>
          <p className="text-gray-600 mt-1">
            {role === 'admin' ? 'Create and manage tests across courses.' : 'Create tests for your students and unlock locked attempts.'}
          </p>
        </div>
        <Button onClick={() => {
          setEditingTest(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test
        </Button>
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      <DataTable
        columns={columns}
        data={tests}
        loading={loading}
        searchKey="title"
        searchPlaceholder="Search tests..."
        onBulkDelete={handleBulkDelete}
        bulkDeleteLabel="Delete selected"
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTest?.id ? 'Edit Test' : 'Create Test'}</DialogTitle>
            <DialogDescription>
              Save the test first, then open it to add questions and monitor attempts.
            </DialogDescription>
          </DialogHeader>
          <FormBuilder
            fields={fields}
            defaultValues={editingTest || {
              status: 'draft',
              duration_minutes: '60',
              lock_on_window_blur: true,
              is_active: true,
            }}
            validationSchema={testSchema}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTest(null);
            }}
            submitLabel={editingTest?.id ? 'Update Test' : 'Create Test'}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
