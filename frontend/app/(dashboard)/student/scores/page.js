'use client';

import { useEffect, useState } from 'react';
import { testScoreAPI } from '@/lib/lmsService'; // Check if APIs exist
import DataTable from '@/components/DataTable';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentScoresPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await testScoreAPI.getAll();
      setScores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch scores', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'test_name',
      header: 'Test Name',
      cell: ({ row }) => (
        <div className="font-bold text-slate-900 flex items-center gap-2">
          {row.original.test_name}
        </div>
      )
    },
    {
      accessorKey: 'test_date',
      header: 'Date',
      cell: ({ row }) => row.original.test_date ? format(new Date(row.original.test_date), 'PPP') : '-'
    },
    {
      accessorKey: 'marks_obtained',
      header: 'Marks',
      cell: ({ row }) => <span className="font-medium">{row.original.marks_obtained} / {row.original.total_marks}</span>
    },
    {
      accessorKey: 'percentage',
      header: 'Percentage',
      cell: ({ row }) => {
        const p = parseFloat(row.original.percentage);
        let color = 'text-red-600';
        if (p >= 80) color = 'text-green-600';
        else if (p >= 60) color = 'text-blue-600';
        else if (p >= 40) color = 'text-yellow-600';

        return <span className={`font-bold ${color}`}>{p}%</span>
      }
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => row.original.remarks || '-'
    },
    {
      accessorKey: 'teacher_name',
      header: 'Graded By'
    }
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Scores</h1>
        <p className="text-muted-foreground">View your performance in tests and assessments.</p>
      </div>


      <DataTable columns={columns} data={scores} searchKey="test_name" />

    </div>
  );
}
