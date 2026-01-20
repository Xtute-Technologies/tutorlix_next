'use client';

import { useEffect, useState } from 'react';
import { attendanceAPI } from '@/lib/lmsService'; // Check if APIs exist
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await attendanceAPI.getAll();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch attendance', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'class_name',
      header: 'Class',
      cell: ({ row }) => <span className="font-medium">{row.original.class_name}</span>
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'PPP') : '-'
    },
    {
      accessorKey: 'class_time',
      header: 'Time',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status; // AB, P, Partial
        const map = {
          'P': { label: 'Present', class: 'bg-green-100 text-green-800' },
          'AB': { label: 'Absent', class: 'bg-red-100 text-red-800' },
          'Partial': { label: 'Partial', class: 'bg-yellow-100 text-yellow-800' }
        };
        const config = map[s] || { label: s, class: 'bg-slate-100' };
        return <Badge className={config.class} variant="outline">{config.label}</Badge>;
      }
    }
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Track your class attendance record.</p>
      </div>


      <DataTable columns={columns} data={attendance} searchKey="class_name" />

    </div>
  );
}
