'use client';

import { useEffect, useState } from 'react';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { categoryAPI } from '@/lib/lmsService';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  heading: z.string().optional(),
  description: z.string().optional(),
});

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      // Ensure data is always an array
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch categories' });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, data);
        setMessage({ type: 'success', text: 'Category updated successfully!' });
      } else {
        await categoryAPI.create(data);
        setMessage({ type: 'success', text: 'Category created successfully!' });
      }

      fetchCategories();
      setShowForm(false);
      setEditingCategory(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save category'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (category) => {
    try {
      // Fetch full category details using the detail API
      const fullCategory = await categoryAPI.getById(category.id);
      setEditingCategory(fullCategory);
      setShowForm(true);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load category details'
      });
    }
  };

  const handleView = async (category) => {
    try {
      // Fetch full category details
      const fullCategory = await categoryAPI.getById(category.id);
      setViewingCategory(fullCategory);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load category details'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await categoryAPI.delete(id);
      setMessage({ type: 'success', text: 'Category deleted successfully!' });
      fetchCategories();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete category'
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setMessage({ type: '', text: '' });
  };

  const categoryFields = [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      placeholder: 'Enter category name',
      required: true,
    },
    {
      name: 'heading',
      label: 'Heading',
      type: 'text',
      placeholder: 'Enter heading (optional)',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter description (optional)',
    },
  ];

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'heading',
      header: 'Heading',
      cell: ({ row }) => (
        <div className="text-gray-600">{row.original.heading || '-'}</div>
      ),
    },
    // {
    //   accessorKey: 'products_count',
    //   header: 'Products',
    //   cell: ({ row }) => (
    //     <Badge variant="outline">
    //       {row.original.products_count || 0} products
    //     </Badge>
    //   ),
    // },
    // {
    //   accessorKey: 'created_at',
    //   header: 'Created',
    //   cell: ({ row }) => {
    //     const date = row.original.created_at;
    //     if (!date) return <div className="text-gray-400">-</div>;

    //     try {
    //       const formattedDate = new Date(date).toLocaleDateString('en-US', {
    //         year: 'numeric',
    //         month: 'short',
    //         day: 'numeric'
    //       });
    //       return <div className="text-gray-600">{formattedDate}</div>;
    //     } catch (error) {
    //       return <div className="text-gray-400">Invalid date</div>;
    //     }
    //   },
    // },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row.original)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4" />
          </Button>
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
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (

      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Manage product categories</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormBuilder
                fields={categoryFields}
                validationSchema={categorySchema}
                onSubmit={handleSubmit}
                submitLabel={editingCategory ? 'Update Category' : 'Create Category'}
                isSubmitting={submitting}
                defaultValues={editingCategory || {}}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        )}

        {/* Data Table */}

        <DataTable
          columns={columns}
          data={categories}
          searchPlaceholder="Search categories..."
        />

      </div>

      {/* View Category Dialog */}
      <Dialog open={!!viewingCategory} onOpenChange={(open) => !open && setViewingCategory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>
              View detailed information about this category
            </DialogDescription>
          </DialogHeader>
          {viewingCategory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-base font-semibold">{viewingCategory.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Products Count</label>
                  <p className="mt-1">
                    <Badge variant="outline">
                      {viewingCategory.products_count || 0} products
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Heading</label>
                <p className="mt-1 text-base">{viewingCategory.heading || '-'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-base text-gray-600 whitespace-pre-wrap">
                  {viewingCategory.description || 'No description available'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Created Date</label>
                <p className="mt-1 text-base">
                  {viewingCategory.created_at
                    ? new Date(viewingCategory.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : '-'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingCategory(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleEdit(viewingCategory);
                    setViewingCategory(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>

  );
}
