'use client';

import { useEffect, useState } from 'react';
import { recordingAPI } from '@/lib/lmsService'; // Check if APIs exist
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentRecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await recordingAPI.getAll();
      setRecordings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch recordings', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'class_name',
      header: 'Class',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-blue-500" />
            {row.original.class_name}
        </div>
      )
    },
    {
      accessorKey: 'teacher_name',
      header: 'Teacher',
      cell: ({ row }) => row.original.teacher_name || '-'
    },
    {
        accessorKey: 'created_at', // Or uploaded_at if available
        header: 'Date',
        cell: ({ row }) => row.original.created_at ? format(new Date(row.original.created_at), 'PPP') : '-'
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => row.original.note || <span className="text-slate-400 italic">No notes</span>
    },
    {
      id: 'actions',
      header: 'View',
      cell: ({ row }) => row.original.recording_link ? (
        <Button size="sm" variant="outline" asChild>
          <a href={row.original.recording_link} target="_blank" rel="noopener noreferrer">
            Watch Recording
          </a>
        </Button>
      ) : <span className="text-slate-400">Processing</span>
    }
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Recordings</h1>
        <p className="text-muted-foreground">Access past class recordings and materials.</p>
      </div>
      
    
          <DataTable columns={columns} data={recordings} searchKey="class_name" />
 
    </div>
  );
}
