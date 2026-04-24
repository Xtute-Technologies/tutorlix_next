'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Play, Lock, RotateCcw } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { testAPI, testAttemptAPI } from '@/lib/lmsService';
import DataTable from '@/components/DataTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StudentTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await testAPI.getAll();
      setTests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tests', error);
      setMessage({ type: 'error', text: 'Failed to fetch tests.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (testId) => {
    try {
      const attempt = await testAttemptAPI.start(testId);
      router.push(`/student/scores/${attempt.id}`);
    } catch (error) {
      console.error('Failed to start test', error);
      const attemptId = error.response?.data?.id;
      if (attemptId) {
        router.push(`/student/scores/${attemptId}`);
        return;
      }
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to start test.' });
    }
  };

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
      accessorKey: 'question_count',
      header: 'Questions',
    },
    {
      accessorKey: 'status_display',
      header: 'Attempt Status',
      cell: ({ row }) => {
        const status = row.original.my_attempt?.status || 'not_started';
        const variant = status === 'locked' ? 'destructive' : status === 'submitted' ? 'secondary' : 'default';
        return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
      },
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Duration',
      cell: ({ row }) => `${row.original.duration_minutes} min`,
    },
    {
      id: 'score',
      header: 'Score',
      cell: ({ row }) => {
        const attempt = row.original.my_attempt;
        if (!attempt?.submitted_at) return '-';
        if (!attempt?.reviewed_at) return 'Pending review';
        return `${attempt.total_awarded_marks || '0.00'} / ${row.original.total_marks || '0.00'}`;
      },
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const attempt = row.original.my_attempt;
        if (attempt?.status === 'submitted') {
          return (
            <Button variant="secondary" size="sm" onClick={() => router.push(`/student/scores/${attempt.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Result
            </Button>
          );
        }
        if (attempt?.id) {
          return (
            <Button variant={attempt.status === 'locked' ? 'destructive' : 'default'} size="sm" onClick={() => router.push(`/student/scores/${attempt.id}`)}>
              {attempt.status === 'locked' ? <Lock className="h-4 w-4 mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              {attempt.status === 'locked' ? 'Locked' : 'Continue'}
            </Button>
          );
        }
        return (
          <Button size="sm" onClick={() => handleStart(row.original.id)}>
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tests</h1>
        <p className="text-muted-foreground">Start, continue, or review the status of your assigned tests.</p>
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      <DataTable columns={columns} data={tests} searchKey="title" loading={loading} />
    </div>
  );
}
