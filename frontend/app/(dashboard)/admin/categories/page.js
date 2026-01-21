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

/* ✅ IMPORT SOURCE OF TRUTH (NO homeContent change) */
import { profileSelectionOptions } from "@/app/data/homeContent";

/* ✅ DERIVE profileTypes SAFELY */
const profileTypes = profileSelectionOptions.map(p => ({
  id: p.id,
  label: p.title,
}));

/* ✅ SAFE EMPTY DEFAULT (fix uncontrolled → controlled) */
const EMPTY_CATEGORY = {
  name: "",
  heading: "",
  description: "",
  profileTypes: [],
};

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  heading: z.string().optional(),
  description: z.string().optional(),
  profileTypes: z.array(z.string()).min(1, "Select at least one profile"),
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
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
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
        text: error.response?.data?.error || 'Failed to save category',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (category) => {
    const fullCategory = await categoryAPI.getById(category.id);

    /* ✅ normalize backend nulls */
    setEditingCategory({
      ...fullCategory,
      profileTypes: fullCategory.profileTypes ?? [],
    });

    setShowForm(true);
  };

  const handleView = async (category) => {
    const fullCategory = await categoryAPI.getById(category.id);
    setViewingCategory({
      ...fullCategory,
      profileTypes: fullCategory.profileTypes ?? [],
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    await categoryAPI.delete(id);
    fetchCategories();
  };

  const categoryFields = [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      required: true,
    },
    {
      name: 'heading',
      label: 'Heading',
      type: 'text',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      name: 'profileTypes',
      label: 'Profile Types',
      type: 'multiselect',
      options: profileTypes.map(p => ({
        label: p.label,
        value: p.id,
      })),
      required: true,
    },
  ];

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'heading',
      header: 'Heading',
      cell: ({ row }) => row.original.heading || '—',
    },
    {
      accessorKey: 'profileTypes',
      header: 'Profile Types',
      cell: ({ row }) => {
        const types = row.original.profileTypes ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {types.map(type => (
              <Badge key={type} variant="secondary">
                {profileTypes.find(p => p.id === type)?.label || type}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleView(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={() => handleDelete(row.original.id)}
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Categories</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormBuilder
                fields={categoryFields}
                validationSchema={categorySchema}
                defaultValues={editingCategory ?? EMPTY_CATEGORY}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                onCancel={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <DataTable columns={columns} data={categories} />
      </div>

      <Dialog open={!!viewingCategory} onOpenChange={() => setViewingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingCategory?.name}</DialogTitle>
            <DialogDescription>{viewingCategory?.description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
