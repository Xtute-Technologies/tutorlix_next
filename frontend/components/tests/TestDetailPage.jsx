'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Eye, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { testAPI, testAttemptAPI, testQuestionAPI } from '@/lib/lmsService';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const questionSchema = z.object({
  order: z.string().min(1, 'Order is required'),
  title: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required'),
  question_type: z.string().min(1, 'Question type is required'),
  marks: z.string().min(1, 'Marks are required'),
  options_text: z.string().optional(),
  correct_options_text: z.string().optional(),
  attachment: z.any().optional(),
  allowed_file_types: z.string().optional(),
  starter_code: z.string().optional(),
  coding_language: z.string().optional(),
  is_required: z.boolean().optional(),
});

function joinLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

export default function TestDetailPage({ role }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionType, setQuestionType] = useState('multiple_choice');

  useEffect(() => {
    if (!user || user.role !== role) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [params.id, role, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const [testData, questionData, attemptData] = await Promise.all([
        testAPI.getById(id),
        testQuestionAPI.getAll({ test: id }),
        testAttemptAPI.getAll({ test: id }),
      ]);
      setTest(testData);
      setQuestions(Array.isArray(questionData) ? questionData : []);
      setAttempts(Array.isArray(attemptData) ? attemptData : []);
    } catch (error) {
      console.error('Failed to fetch test details', error);
      setMessage({ type: 'error', text: 'Failed to load test details.' });
    } finally {
      setLoading(false);
    }
  };

  const questionFields = useMemo(() => {
    const fields = [
      { name: 'order', label: 'Order', type: 'number', required: true },
      { name: 'title', label: 'Short Title', type: 'text' },
      { name: 'prompt', label: 'Prompt', type: 'textarea', rows: 5, required: true },
      {
        name: 'question_type',
        label: 'Question Type',
        type: 'select',
        options: [
          { label: 'Multiple Choice', value: 'multiple_choice' },
          { label: 'Subjective', value: 'subjective' },
          { label: 'File Upload', value: 'file_upload' },
          { label: 'Coding', value: 'coding' },
        ],
        onChange: (value) => setQuestionType(value),
        required: true,
      },
      { name: 'marks', label: 'Marks', type: 'number', required: true },
    ];

    if (questionType === 'multiple_choice') {
      fields.push(
        { name: 'options_text', label: 'Options', type: 'textarea', rows: 4, description: 'One option per line for multiple choice questions.' },
        { name: 'correct_options_text', label: 'Correct Options', type: 'textarea', rows: 3, description: 'One correct option per line.' },
      );
    }

    if (questionType === 'file_upload') {
      fields.push(
        { name: 'attachment', label: 'Attachment', type: 'file', accept: '.png,.jpg,.jpeg,.pdf,.doc,.docx' },
        { name: 'allowed_file_types', label: 'Allowed Upload Types', type: 'text', placeholder: 'pdf,doc,docx,jpg,png' },
      );
    }

    if (questionType === 'coding') {
      fields.push(
        { name: 'starter_code', label: 'Starter Code', type: 'textarea', rows: 8 },
        { name: 'coding_language', label: 'Coding Language', type: 'text', placeholder: 'python' },
      );
    }

    fields.push(
      { name: 'is_required', label: 'Required', type: 'checkbox', placeholder: 'Student must answer this question' },
    );

    return fields;
  }, [questionType]);

  const handleSaveQuestion = async (data) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('test', String(test.id));
      formData.append('order', String(data.order));
      formData.append('title', data.title || '');
      formData.append('prompt', data.prompt || '');
      formData.append('question_type', data.question_type);
      formData.append('marks', String(data.marks));
      formData.append('is_required', data.is_required ? 'true' : 'false');
      formData.append('options', data.options_text || '');
      formData.append('correct_options', data.correct_options_text || '');
      formData.append('allowed_file_types', data.allowed_file_types || '');
      formData.append('starter_code', data.starter_code || '');
      formData.append('coding_language', data.coding_language || '');
      if (data.attachment instanceof File) {
        formData.append('attachment', data.attachment);
      }

      if (editingQuestion?.id) {
        await testQuestionAPI.update(editingQuestion.id, formData);
        setMessage({ type: 'success', text: 'Question updated successfully.' });
      } else {
        await testQuestionAPI.create(formData);
        setMessage({ type: 'success', text: 'Question created successfully.' });
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save question', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save question.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditQuestion = (question) => {
    setQuestionType(question.question_type || 'multiple_choice');
    setEditingQuestion({
      ...question,
      order: String(question.order),
      marks: String(question.marks),
      options_text: joinLines(question.options),
      correct_options_text: joinLines(question.correct_options),
      is_required: question.is_required,
    });
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await testQuestionAPI.delete(id);
      setMessage({ type: 'success', text: 'Question deleted successfully.' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete question', error);
      setMessage({ type: 'error', text: 'Failed to delete question.' });
    }
  };

  const handleUnlockAttempt = async (attemptId) => {
    try {
      await testAttemptAPI.unlock(attemptId);
      setMessage({ type: 'success', text: 'Attempt unlocked successfully.' });
      fetchData();
    } catch (error) {
      console.error('Failed to unlock attempt', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to unlock attempt.' });
    }
  };

  const questionColumns = [
    { accessorKey: 'order', header: '#' },
    {
      accessorKey: 'prompt',
      header: 'Question',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title || `Question ${row.original.order}`}</div>
          <div className="text-xs text-gray-500 line-clamp-2">{row.original.prompt}</div>
        </div>
      ),
    },
    { accessorKey: 'question_type', header: 'Type' },
    { accessorKey: 'marks', header: 'Marks' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteQuestion(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const attemptColumns = [
    {
      accessorKey: 'student_name',
      header: 'Student',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'locked' ? 'destructive' : row.original.status === 'submitted' ? 'secondary' : 'default'}>
          {row.original.status}
        </Badge>
      ),
    },
    { accessorKey: 'answered_count', header: 'Answers' },
    { accessorKey: 'window_violation_count', header: 'Violations' },
    {
      accessorKey: 'locked_reason',
      header: 'Lock Reason',
      cell: ({ row }) => row.original.locked_reason || '-',
    },
    {
      id: 'review',
      header: 'Review',
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`${basePath}/${test?.id}/attempts/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Answers
          </Link>
        </Button>
      ),
    },
    {
      id: 'unlock',
      header: 'Unlock',
      cell: ({ row }) => (
        row.original.status === 'locked' && row.original.can_unlock ? (
          <Button variant="outline" size="sm" onClick={() => handleUnlockAttempt(row.original.id)}>
            <Unlock className="h-4 w-4 mr-2" />
            Unlock
          </Button>
        ) : row.original.status === 'locked' ? (
          <div className="text-xs text-gray-500 flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</div>
        ) : '-'
      ),
    },
  ];

  const basePath = role === 'admin' ? '/admin/test-scores' : '/teacher/test-scores';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={basePath} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Tests
          </Link>
          <h1 className="text-3xl font-bold mt-2">{test?.title || 'Test'}</h1>
          <p className="text-gray-600 mt-1">
            {test?.product_name || 'Course'} • {test?.status || 'draft'} • {test?.duration_minutes || 0} minutes
          </p>
        </div>
        <Button onClick={() => {
          setQuestionType('multiple_choice');
          setEditingQuestion({
            order: String(questions.length + 1 || 1),
            question_type: 'multiple_choice',
            marks: '1',
            is_required: true,
          });
          setShowQuestionForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Instructions</h2>
        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{test?.instructions || 'No instructions added yet.'}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          <DataTable
            columns={questionColumns}
            data={questions}
            loading={loading}
            searchKey="prompt"
            searchPlaceholder="Search questions..."
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Attempts</h2>
          <DataTable
            columns={attemptColumns}
            data={attempts}
            loading={loading}
            searchKey="student_name"
            searchPlaceholder="Search students..."
          />
        </div>
      </div>

      <Dialog open={showQuestionForm} onOpenChange={setShowQuestionForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion?.id ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>
              You can create multiple choice, subjective, file upload, or coding questions.
            </DialogDescription>
          </DialogHeader>
          <FormBuilder
            fields={questionFields}
            defaultValues={editingQuestion}
            validationSchema={questionSchema}
            onSubmit={handleSaveQuestion}
            onCancel={() => {
              setShowQuestionForm(false);
              setEditingQuestion(null);
            }}
            submitLabel={editingQuestion?.id ? 'Update Question' : 'Create Question'}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
