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

const parseMarks = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMarks = (value) => parseMarks(value).toFixed(2);

const calculatePercentage = (marksObtained, totalMarks) => {
  const obtained = parseMarks(marksObtained);
  const total = parseMarks(totalMarks);
  if (total <= 0) return null;
  return (obtained / total) * 100;
};

const calculateReviewedTotals = (tests) => {
  return tests.reduce(
    (totals, test) => {
      const attempt = test.my_attempt;
      if (!attempt?.submitted_at || !attempt?.reviewed_at) return totals;
      return {
        obtained: totals.obtained + parseMarks(attempt.total_awarded_marks),
        total: totals.total + parseMarks(test.total_marks),
        count: totals.count + 1,
      };
    },
    { obtained: 0, total: 0, count: 0 }
  );
};

export default function StudentTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const reviewedTotals = calculateReviewedTotals(tests);
  const totalPercentage = reviewedTotals.total > 0 ? (reviewedTotals.obtained / reviewedTotals.total) * 100 : null;

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
      header: 'Percentage',
      cell: ({ row }) => {
        const attempt = row.original.my_attempt;
        if (!attempt?.submitted_at) return '-';
        if (!attempt?.reviewed_at) return 'Pending review';
        const percentage = calculatePercentage(attempt.total_awarded_marks, row.original.total_marks);
        if (percentage === null) return '-';
        return (
          <div>
            <div className="font-medium">{percentage.toFixed(2)}%</div>
            <div className="text-xs text-gray-500">
              {formatMarks(attempt.total_awarded_marks)} / {formatMarks(row.original.total_marks)}
            </div>
          </div>
        );
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

      <Card className="p-4">
        <div className="text-sm text-gray-500">Total Percentage</div>
        <div className="mt-1 text-2xl font-semibold">
          {totalPercentage === null ? '-' : `${totalPercentage.toFixed(2)}%`}
        </div>
        <div className="text-xs text-gray-500">
          {reviewedTotals.count > 0
            ? `${formatMarks(reviewedTotals.obtained)} / ${formatMarks(reviewedTotals.total)} across ${reviewedTotals.count} reviewed test${reviewedTotals.count === 1 ? '' : 's'}`
            : 'No reviewed tests yet'}
        </div>
      </Card>

      <DataTable columns={columns} data={tests} searchKey="title" loading={loading} />
    </div>
  );
}
