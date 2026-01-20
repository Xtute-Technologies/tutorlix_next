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
import { studentClassAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { z } from 'zod';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  time: z.string().min(1, 'Class time is required'),
  class_link: z.string().url('Must be a valid URL'),
  // teacher removed
  students: z.array(z.number()).optional(),
  is_active: z.boolean().optional(),
});

export default function TeacherStudentClassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
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
      const [classesData, studentsData] = await Promise.all([
        studentClassAPI.getAll(),
        authService.getAllUsers({ role: 'student' }),
      ]);
      
      setClasses(Array.isArray(classesData) ? classesData : []);
      setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setClasses([]);
      setStudents([]);
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
        // teacher implicit
        students: Array.isArray(data.students) ? data.students : [],
        is_active: data.is_active !== undefined ? data.is_active : true,
      };

      if (editingClass) {
        await studentClassAPI.update(editingClass.id, classData);
        setMessage({ type: 'success', text: 'Class updated successfully!' });
      } else {
        await studentClassAPI.create(classData);
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
      const fullClass = await studentClassAPI.getById(classItem.id);
      setEditingClass({
        ...fullClass,
        students: fullClass.students || [],
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
      await studentClassAPI.delete(id);
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
      name: 'name',
      label: 'Class Name',
      type: 'text',
      placeholder: 'e.g., One-on-One Physics Tutoring',
      required: true,
    },
    {
      name: 'time',
      label: 'Time',
      type: 'text',
      placeholder: 'e.g., Mondays 10:00 AM',
      required: true,
    },
    {
      name: 'class_link',
      label: 'Meeting Link',
      type: 'url',
      placeholder: 'Zoom/Google Meet Link',
      required: true,
    },
    {
      name: 'students',
      label: 'Students',
      type: 'multiselect',
      placeholder: 'Select students',
      options: students.map((s) => ({
        label: `${s.first_name} ${s.last_name} (${s.email})`,
        value: s.id,
      })),
    },
    {
      name: 'is_active',
      label: 'Active Class',
      type: 'checkbox',
    },
  ], [students]);

  const columns = [
    {
      accessorKey: 'name',
      header: 'Class Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <div className="font-medium">{row.original.name}</div>
        </div>
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
      accessorKey: 'students',
      header: 'Students',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.students_count || (row.original.students ? row.original.students.length : 0)} students
        </Badge>
      ),
    },
    {
      accessorKey: 'class_link',
      header: 'Link',
      cell: ({ row }) => (
        <a
          href={row.original.class_link}
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
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
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

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Student Classes</h1>
            <p className="text-gray-600 mt-1">Manage individual or group classes for your students</p>
          </div>
          <Button onClick={() => {
            setEditingClass(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>

        {message.text && (
          <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message.text}
          </Card>
        )}

        <DataTable
          columns={columns}
          data={classes}
          loading={loading}
          searchKey="name"
          searchPlaceholder="Search classes..."
        />

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Edit Class' : 'New Class'}
              </DialogTitle>
              <DialogDescription>
                {editingClass
                  ? 'Update class details'
                  : 'Create a new class session for your students.'}
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
