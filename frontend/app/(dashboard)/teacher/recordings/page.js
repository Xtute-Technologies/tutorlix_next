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
import { recordingAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2, Video } from 'lucide-react';
import { z } from 'zod';

const recordingSchema = z.object({
    class_name: z.string().min(1, 'Class name is required'),
    recording_link: z.string().url('Must be a valid URL'),
    // teacher field removed (implicit)
    students: z.array(z.number()).optional(),
    note: z.string().optional(),
});

export default function TeacherRecordingsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [recordings, setRecordings] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecording, setEditingRecording] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user || user.role !== 'teacher') {
            router.push('/dashboard');
            return;
        }
        fetchData();
    }, [user, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [recordingsData, studentsData] = await Promise.all([
                recordingAPI.getAll(), // Backend filters by teacher
                authService.getAllUsers({ role: 'student' }),
            ]);

            setRecordings(Array.isArray(recordingsData) ? recordingsData : []);
            setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch data' });
            setRecordings([]);
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
                // teacher: implicit in backend
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
    ], [students]);

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

    return (
        
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">My Recordings</h1>
                        <p className="text-gray-600 mt-1">Manage class recordings and student access</p>
                    </div>
                    <Button onClick={() => {
                        setEditingRecording(null);
                        setShowForm(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recording
                    </Button>
                </div>

                {message.text && (
                    <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                        {message.text}
                    </Card>
                )}

                <DataTable
                    columns={columns}
                    data={recordings}
                    loading={loading}
                    searchKey="class_name"
                    searchPlaceholder="Search recordings..."
                />

                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecording ? 'Edit Recording' : 'Add New Recording'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRecording
                                    ? 'Update recording details'
                                    : 'Add a new class recording and assign it to students.'}
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
        
    );
}
