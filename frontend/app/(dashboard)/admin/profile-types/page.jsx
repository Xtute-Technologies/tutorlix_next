'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { profileTypeAPI } from '@/lib/lmsService';

const EMPTY_PROFILE = {
  slug: '',
  title: '',
  description: '',
  order: 1,
  is_active: true,
};

const profileSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order: z.coerce.number().int().min(0),
  is_active: z.boolean().optional(),
});

export default function ProfileTypesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await profileTypeAPI.getAll();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      setProfiles([]);
      setMessage({ type: 'error', text: 'Failed to fetch profile types.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      if (editingProfile) {
        await profileTypeAPI.update(editingProfile.slug, data);
        setMessage({ type: 'success', text: 'Profile type updated successfully.' });
      } else {
        await profileTypeAPI.create(data);
        setMessage({ type: 'success', text: 'Profile type created successfully.' });
      }

      setShowForm(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile type.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Are you sure you want to delete this profile type?')) return;
    try {
      await profileTypeAPI.delete(slug);
      fetchProfiles();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete profile type.' });
    }
  };

  const fields = [
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'order', label: 'Order', type: 'number', required: true },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ];

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'slug', header: 'Slug' },
    { accessorKey: 'order', header: 'Order' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setViewingProfile(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            setEditingProfile(row.original);
            setShowForm(true);
          }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(row.original.slug)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Profile Types</h1>
          <Button onClick={() => { setEditingProfile(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Profile Type
          </Button>
        </div>

        {message.text && (
          <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingProfile ? 'Edit Profile Type' : 'Add Profile Type'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormBuilder
                fields={fields}
                validationSchema={profileSchema}
                defaultValues={editingProfile ?? EMPTY_PROFILE}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                onCancel={() => {
                  setShowForm(false);
                  setEditingProfile(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <DataTable columns={columns} data={profiles} />
      </div>

      <Dialog open={!!viewingProfile} onOpenChange={() => setViewingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingProfile?.title}</DialogTitle>
            <DialogDescription>{viewingProfile?.description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
