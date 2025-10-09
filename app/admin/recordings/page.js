'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { recordingAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2, Video } from 'lucide-react';
import { z } from 'zod';

const recordingSchema = z.object({
    class_name: z.string().min(1, 'Class name is required'),
    recording_link: z.string().url('Must be a valid URL'),
    teacher: z.string().optional(),
    students: z.array(z.number()).optional(),
    note: z.string().optional(),
});

export default function RecordingsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [recordings, setRecordings] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecording, setEditingRecording] = useState(null);
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
            const [recordingsData, teachersData, studentsData] = await Promise.all([
                recordingAPI.getAll(),
                authService.getAllUsers('teacher'),
                authService.getAllUsers('student'),
            ]);

            // recordingAPI.getAll() returns array directly (uses extractResults helper)
            // authService.getAllUsers() returns pagination object with 'results' key
            setRecordings(Array.isArray(recordingsData) ? recordingsData : []);
            setTeachers(Array.isArray(teachersData?.results) ? teachersData.results : []);
            setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch data' });
            setRecordings([]);
            setTeachers([]);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data) => {
        try {
            setSubmitting(true);
            setMessage({ type: '', text: '' });

            const recordingData = {
                ...data,
                teacher: data.teacher ? Number(data.teacher) : null,
                students: Array.isArray(data.students) ? data.students : [],
            };

            if (editingRecording) {
                await recordingAPI.update(editingRecording.id, recordingData);
                setMessage({ type: 'success', text: 'Recording updated successfully!' });
            } else {
                await recordingAPI.create(recordingData);
                setMessage({ type: 'success', text: 'Recording created successfully!' });
            }

            setShowForm(false);
            setEditingRecording(null);
            fetchData();
        } catch (error) {
            console.error('Submit error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to save recording',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (recording) => {
        try {
            const fullRecording = await recordingAPI.getById(recording.id);
            setEditingRecording({
                ...fullRecording,
                teacher: fullRecording.teacher ? fullRecording.teacher.toString() : undefined,
                students: fullRecording.students || [],
            });
            setShowForm(true);
        } catch (error) {
            console.error('Error fetching recording details:', error);
            setMessage({ type: 'error', text: 'Failed to load recording details' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this recording?')) return;

        try {
            await recordingAPI.delete(id);
            setMessage({ type: 'success', text: 'Recording deleted successfully!' });
            fetchData();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to delete recording',
            });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingRecording(null);
    };

    const recordingFields = useMemo(() => [
        {
            name: 'class_name',
            label: 'Class Name',
            type: 'text',
            placeholder: 'e.g., Advanced Mathematics - Chapter 1',
            required: true,
        },
        {
            name: 'recording_link',
            label: 'Recording Link',
            type: 'url',
            placeholder: 'https://drive.google.com/...',
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
            name: 'students',
            label: 'Students',
            type: 'multiselect',
            placeholder: 'Select students who can access',
            options: students.map((s) => ({
                label: `${s.first_name} ${s.last_name} (${s.email})`,
                value: s.id,
            })),
        },
        {
            name: 'note',
            label: 'Notes',
            type: 'textarea',
            placeholder: 'Additional notes about the recording',
        },
    ], [teachers, students]);

    const columns = [
        {
            accessorKey: 'class_name',
            header: 'Recording',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-gray-400" />
                    <div className="font-medium">{row.original.class_name}</div>
                </div>
            ),
        },
        {
            accessorKey: 'uploaded_at',
            header: 'Upload Date',
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {new Date(row.original.uploaded_at).toLocaleDateString()}
                </span>
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
            accessorKey: 'students',
            header: 'Students',
            cell: ({ row }) => (
                <Badge variant="outline">
                    {row.original.students_count || 0} students
                </Badge>
            ),
        },
        {
            accessorKey: 'recording_link',
            header: 'Link',
            cell: ({ row }) => (
                <a
                    href={row.original.recording_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                >
                    Watch Recording
                </a>
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
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Recordings</h1>
                        <p className="text-gray-600 mt-1">
                            Manage class recordings and student access
                        </p>
                    </div>
                    <Button onClick={() => {
                        setEditingRecording(null);
                        setShowForm(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recording
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
                <DataTable data={recordings} columns={columns} searchPlaceholder="Search Recordings..." />

                {/* Add/Edit Form Dialog */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecording ? 'Edit Recording' : 'Add New Recording'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRecording
                                    ? 'Update recording information'
                                    : 'Upload a new class recording'}
                            </DialogDescription>
                        </DialogHeader>
                        <FormBuilder
                            fields={recordingFields}
                            defaultValues={editingRecording}
                            validationSchema={recordingSchema}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            submitLabel={editingRecording ? 'Update Recording' : 'Create Recording'}
                            isSubmitting={submitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
