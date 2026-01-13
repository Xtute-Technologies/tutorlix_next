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
import { courseClassAPI, productAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const classSchema = z.object({
    product: z.string().min(1, 'Product/Course is required'),
    name: z.string().min(1, 'Class name is required'),
    time: z.string().min(1, 'Class time is required'),
    link: z.string().url('Must be a valid URL'),
    teacher: z.string().optional(),
    is_active: z.boolean().optional(),
});

export default function CourseClassesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [products, setProducts] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
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
            const [classesData, productsData, teachersData] = await Promise.all([
                courseClassAPI.getAll(),
                productAPI.getAll(),
                authService.getAllUsers('teacher'),
            ]);
            setClasses(Array.isArray(classesData) ? classesData : []);
            setProducts(Array.isArray(productsData) ? productsData : []);
            setTeachers(Array.isArray(teachersData?.results) ? teachersData.results : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch data' });
            setClasses([]);
            setProducts([]);
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data) => {
        try {
            setSubmitting(true);
            setMessage({ type: '', text: '' });

            const classData = {
                ...data,
                product: Number(data.product),
                teacher: data.teacher ? Number(data.teacher) : null,
                is_active: data.is_active !== undefined ? data.is_active : true,
            };

            if (editingClass) {
                await courseClassAPI.update(editingClass.id, classData);
                setMessage({ type: 'success', text: 'Class updated successfully!' });
            } else {
                await courseClassAPI.create(classData);
                setMessage({ type: 'success', text: 'Class created successfully!' });
            }

            setShowForm(false);
            setEditingClass(null);
            fetchData();
        } catch (error) {
            console.error('Submit error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to save class',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (classItem) => {
        try {
            const fullClass = await courseClassAPI.getById(classItem.id);
            setEditingClass({
                ...fullClass,
                product: fullClass.product ? fullClass.product.toString() : undefined,
                teacher: fullClass.teacher ? fullClass.teacher.toString() : undefined,
            });
            setShowForm(true);
        } catch (error) {
            console.error('Error fetching class details:', error);
            setMessage({ type: 'error', text: 'Failed to load class details' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this class?')) return;

        try {
            await courseClassAPI.delete(id);
            setMessage({ type: 'success', text: 'Class deleted successfully!' });
            fetchData();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to delete class',
            });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingClass(null);
    };

    const classFields = useMemo(() => [
        {
            name: 'product',
            label: 'Product/Course',
            type: 'select',
            placeholder: 'Select product/course',
            options: products.map((p) => ({
                label: `${p.name} (${p.category_name || 'No Category'})`,
                value: p.id.toString(),
            })),
            required: true,
        },
        {
            name: 'name',
            label: 'Class Name',
            type: 'text',
            placeholder: 'e.g., Module 1 - Introduction',
            required: true,
        },
        {
            name: 'time',
            label: 'Class Time',
            type: 'text',
            placeholder: 'e.g., Every Tuesday 2:00 PM - 3:30 PM',
            required: true,
        },
        {
            name: 'link',
            label: 'Class Link',
            type: 'url',
            placeholder: 'https://zoom.us/j/...',
            required: true,
        },
        {
            name: 'teacher',
            label: 'Teacher (Optional)',
            type: 'select',
            placeholder: 'Select teacher (optional)',
            options: teachers.map((t) => ({
                label: `${t.first_name} ${t.last_name} (${t.email})`,
                value: t.id.toString(),
            })),
        },
        {
            name: 'is_active',
            label: 'Active',
            type: 'checkbox',
        },
    ], [products, teachers]);

    const columns = [
        {
            accessorKey: 'product_name',
            header: 'Product/Course',
            cell: ({ row }) => (
                <Badge variant="outline" className="font-medium">
                    {row.original.product_name}
                </Badge>
            ),
        },
        {
            accessorKey: 'name',
            header: 'Class Name',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.name}</div>
            ),
        },
        {
            accessorKey: 'time',
            header: 'Schedule',
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">{row.original.time}</span>
            ),
        },
        {
            accessorKey: 'teacher_name',
            header: 'Teacher',
            cell: ({ row }) => (
                row.original.teacher_name || <span className="text-gray-400">Not Assigned</span>
            ),
        },
        {
            accessorKey: 'link',
            header: 'Link',
            cell: ({ row }) => (
                <a
                    href={row.original.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                >
                    Join Class
                </a>
            ),
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                <Badge
                    className={
                        row.original.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }
                >
                    {row.original.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
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
        
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Course Classes</h1>
                        <p className="text-gray-600 mt-1">
                            Manage classes organized by main courses
                        </p>
                    </div>
                    <Button onClick={() => {
                        setEditingClass(null);
                        setShowForm(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Class
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

                {/* Table */}

                <DataTable data={classes} columns={columns} />

                {/* Add/Edit Form Dialog */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingClass ? 'Edit Class' : 'Add New Class'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingClass
                                    ? 'Update class information'
                                    : 'Create a new course-specific class'}
                            </DialogDescription>
                        </DialogHeader>
                        <FormBuilder
                            fields={classFields}
                            defaultValues={editingClass}
                            validationSchema={classSchema}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            submitLabel={editingClass ? 'Update Class' : 'Create Class'}
                            isSubmitting={submitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        
    );
}
