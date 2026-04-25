'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { masterclassAPI } from '@/lib/lmsService';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  time: z.string().min(1, 'Class time is required'),
  class_link: z.string().url('Must be a valid URL'),
  image: z.any().optional(),
  is_active: z.boolean().optional(),
});

export default function MasterclassesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 🔐 Admin Only
  useEffect(() => {
    if (!user) return;

    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await masterclassAPI.getAll();
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FINAL FIXED SUBMIT
  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const formData = new FormData();

      formData.append('name', data.name);
      formData.append('time', data.time);
      formData.append('class_link', data.class_link);

      // Boolean fix (must be string for multipart)
      formData.append(
        'is_active',
        data.is_active ? 'true' : 'false'
      );

      // 🔥 Only append if real File
      if (data.image && data.image instanceof File) {
        formData.append('image', data.image);
      }

      if (editingClass) {
        await masterclassAPI.update(editingClass.id, formData);
        setMessage({ type: 'success', text: 'Class updated successfully!' });
      } else {
        await masterclassAPI.create(formData);
        setMessage({ type: 'success', text: 'Class created successfully!' });
      }

      setShowForm(false);
      setEditingClass(null);
      fetchData();

    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save class' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return;

    await masterclassAPI.delete(id);
    setMessage({ type: 'success', text: 'Class deleted successfully!' });
    fetchData();
  };

  const handleBulkDelete = async (rows) => {
    const results = await Promise.allSettled(rows.map((row) => masterclassAPI.delete(row.id)));
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    setMessage(
      failedCount > 0
        ? { type: 'error', text: `${failedCount} class(es) could not be deleted.` }
        : { type: 'success', text: `${rows.length} class(es) deleted successfully!` }
    );
    fetchData();
  };

  const classFields = useMemo(() => [
    {
      name: 'name',
      label: 'Class Name',
      type: 'text',
      required: true,
    },
    {
      name: 'time',
      label: 'Class Time',
      type: 'text',
      required: true,
    },
    {
      name: 'class_link',
      label: 'Class Link',
      type: 'url',
      required: true,
    },
    {
      name: 'image',
      label: 'Class Image',
      type: 'file',
      accept: 'image/*',
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
    },
  ], []);

  const columns = [
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) =>
        row.original.image ? (
          <img
            src={row.original.image}
            alt={row.original.name}
            className="w-16 h-16 object-cover rounded-md border"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        ),
    },
    {
      accessorKey: 'name',
      header: 'Class Name',
    },
    {
      accessorKey: 'time',
      header: 'Schedule',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 text-xs rounded ${row.original.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
            }`}
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingClass(row.original);
              setShowForm(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex justify-center py-20">Loading...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Masterclasses</h1>
        <Button onClick={() => {
          setEditingClass(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {message.text && (
        <div
          className={`p-3 rounded ${message.type === 'success'
              ? 'bg-green-100'
              : 'bg-red-100'
            }`}
        >
          {message.text}
        </div>
      )}

      <DataTable
        data={classes}
        columns={columns}
        searchPlaceholder="Search classes..."
        onBulkDelete={handleBulkDelete}
        bulkDeleteLabel="Delete selected"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClass ? 'Edit Class' : 'Add Class'}
            </DialogTitle>
            <DialogDescription>
              Manage masterclass details
            </DialogDescription>
          </DialogHeader>

          <FormBuilder
            fields={classFields}
            defaultValues={editingClass}
            validationSchema={classSchema}
            onSubmit={handleSubmit}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
