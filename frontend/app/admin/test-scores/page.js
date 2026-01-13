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
import { testScoreAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2, Award } from 'lucide-react';
import { z } from 'zod';

const testScoreSchema = z.object({
    student: z.string().min(1, 'Student is required'),
    test_name: z.string().min(1, 'Test name is required'),
    marks_obtained: z.string().min(1, 'Marks obtained is required'),
    total_marks: z.string().min(1, 'Total marks is required'),
    teacher: z.string().optional(),
    test_date: z.string().min(1, 'Test date is required'),
    remarks: z.string().optional(),
});

export default function TestScoresPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [testScores, setTestScores] = useState([]);
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingScore, setEditingScore] = useState(null);
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
            const [scoresData, studentsData, teachersData] = await Promise.all([
                testScoreAPI.getAll(),
                authService.getAllUsers('student'),
                authService.getAllUsers('teacher'),
            ]);

            setTestScores(Array.isArray(scoresData) ? scoresData : []);
            setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
            setTeachers(Array.isArray(teachersData?.results) ? teachersData.results : []);
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch data' });
            setTestScores([]);
            setStudents([]);
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data) => {
        try {
            setSubmitting(true);
            setMessage({ type: '', text: '' });

            const scoreData = {
                ...data,
                student: Number(data.student),
                teacher: data.teacher ? Number(data.teacher) : null,
                marks_obtained: parseFloat(data.marks_obtained),
                total_marks: parseFloat(data.total_marks),
            };

            if (editingScore) {
                await testScoreAPI.update(editingScore.id, scoreData);
                setMessage({ type: 'success', text: 'Test score updated successfully!' });
            } else {
                await testScoreAPI.create(scoreData);
                setMessage({ type: 'success', text: 'Test score created successfully!' });
            }

            setShowForm(false);
            setEditingScore(null);
            fetchData();
        } catch (error) {
            console.error('Submit error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to save test score',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (score) => {
        try {
            const fullScore = await testScoreAPI.getById(score.id);
            setEditingScore({
                ...fullScore,
                student: fullScore.student ? fullScore.student.toString() : undefined,
                teacher: fullScore.teacher ? fullScore.teacher.toString() : undefined,
                marks_obtained: fullScore.marks_obtained?.toString() || '',
                total_marks: fullScore.total_marks?.toString() || '',
                test_date: fullScore.test_date || new Date().toISOString().split('T')[0],
            });
            setShowForm(true);
        } catch (error) {
            console.error('Error fetching test score details:', error);
            setMessage({ type: 'error', text: 'Failed to load test score details' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this test score?')) return;

        try {
            await testScoreAPI.delete(id);
            setMessage({ type: 'success', text: 'Test score deleted successfully!' });
            fetchData();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to delete test score',
            });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingScore(null);
    };

    const testScoreFields = useMemo(() => [
        {
            name: 'student',
            label: 'Student',
            type: 'select',
            placeholder: 'Select student',
            options: students.map((s) => ({
                label: `${s.full_name} (${s.email})`,
                value: s.id.toString(),
            })),
            required: true,
        },
        {
            name: 'test_name',
            label: 'Test Name',
            type: 'text',
            placeholder: 'e.g., Mid-Term Exam - Mathematics',
            required: true,
        },
        {
            name: 'marks_obtained',
            label: 'Marks Obtained',
            type: 'number',
            placeholder: 'e.g., 85',
            required: true,
        },
        {
            name: 'total_marks',
            label: 'Total Marks',
            type: 'number',
            placeholder: 'e.g., 100',
            required: true,
        },
        {
            name: 'test_date',
            label: 'Test Date',
            type: 'date',
            required: true,
        },
        {
            name: 'teacher',
            label: 'Teacher (Optional)',
            type: 'select',
            placeholder: 'Select teacher (optional)',
            options: teachers.map((t) => ({
                label: `${t.full_name} (${t.email})`,
                value: t.id.toString(),
            })),
        },
        {
            name: 'remarks',
            label: 'Remarks',
            type: 'textarea',
            placeholder: 'Additional notes or comments',
        },
    ], [students, teachers]);

    const columns = [
        {
            accessorKey: 'student_name',
            header: 'Student',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <div className="font-medium">{row.original.student_name}</div>
                </div>
            ),
        },
        {
            accessorKey: 'test_name',
            header: 'Test Name',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.test_name}</span>
            ),
        },
        {
            accessorKey: 'marks',
            header: 'Score',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium">
                        {row.original.marks_obtained} / {row.original.total_marks}
                    </div>
                    <Badge variant={row.original.percentage >= 60 ? 'default' : 'destructive'}>
                        {row.original.percentage}%
                    </Badge>
                </div>
            ),
        },
        {
            accessorKey: 'test_date',
            header: 'Test Date',
            cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                    {new Date(row.original.test_date).toLocaleDateString()}
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
                        <h1 className="text-3xl font-bold">Test Scores</h1>
                        <p className="text-gray-600 mt-1">Manage student test scores and grades</p>
                    </div>
                    <Button onClick={() => {
                        setEditingScore(null);
                        setShowForm(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Test Score
                    </Button>
                </div>

                {message.text && (
                    <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                        {message.text}
                    </Card>
                )}


                <DataTable
                    columns={columns}
                    data={testScores}
                    loading={loading}
                    searchKey="student_name"
                    searchPlaceholder="Search by student name..."
                />


                {/* Add/Edit Form Dialog */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingScore ? 'Edit Test Score' : 'Add New Test Score'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingScore
                                    ? 'Update test score details'
                                    : 'Record a new test score for a student'}
                            </DialogDescription>
                        </DialogHeader>
                        <FormBuilder
                            fields={testScoreFields}
                            defaultValues={editingScore}
                            validationSchema={testScoreSchema}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            submitLabel={editingScore ? 'Update Score' : 'Create Score'}
                            isSubmitting={submitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        
    );
}
