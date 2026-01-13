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
  teacher: z.string().optional(),
  students: z.array(z.number()).optional(),
  is_active: z.boolean().optional(),
});

export default function StudentClassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

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
      const [classesData, teachersData, studentsData] = await Promise.all([
        studentClassAPI.getAll(),
        authService.getAllUsers('teacher'),
        authService.getAllUsers('student'),
      ]);
      
      // studentClassAPI.getAll() returns array directly (uses extractResults helper)
      // authService.getAllUsers() returns pagination object with 'results' key
      setClasses(Array.isArray(classesData) ? classesData : []);
      setTeachers(Array.isArray(teachersData?.results) ? teachersData.results : []);
      setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setClasses([]);
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

      const classData = {
        ...data,
        teacher: data.teacher ? Number(data.teacher) : null,
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
        teacher: fullClass.teacher ? fullClass.teacher.toString() : undefined,
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

  const handleManageStudents = (classItem) => {
    setSelectedClass(classItem);
    setShowStudentsDialog(true);
  };


  const handleRemoveStudent = async (studentId) => {
    if (!selectedClass) return;
    
    try {
      await studentClassAPI.removeStudents(selectedClass.id, [studentId]);
      setMessage({ type: 'success', text: 'Student removed successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to remove student',
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
      placeholder: 'e.g., Advanced Mathematics',
      required: true,
    },
    {
      name: 'time',
      label: 'Class Time',
      type: 'text',
      placeholder: 'e.g., Every Monday 10:00 AM - 11:30 AM',
      required: true,
    },
    {
      name: 'class_link',
      label: 'Class Link',
      type: 'url',
      placeholder: 'https://zoom.us/j/...',
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
      placeholder: 'Select students',
      options: students.map((s) => ({
        label: `${s.first_name} ${s.last_name} (${s.email})`,
        value: s.id,
      })),
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
    },
  ], [teachers, students]);

  const columns = [
    {
      accessorKey: 'name',
      header: 'Class Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
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
        <Badge
          className={
            row.original.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
            onClick={() => handleManageStudents(row.original)}
            title="Manage Students"
          >
            <Users className="h-4 w-4" />
          </Button>
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
      
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      
    );
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Classes</h1>
            <p className="text-gray-600 mt-1">
              Manage personalized classes for individual students
            </p>
          </div>
          <Button onClick={() => {
            setEditingClass(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Table */}
      
          <DataTable data={classes} columns={columns} searchPlaceholder="Search Classess..." />
      

        {/* Add/Edit Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Edit Class' : 'Add New Class'}
              </DialogTitle>
              <DialogDescription>
                {editingClass
                  ? 'Update class information'
                  : 'Create a new student-specific class'}
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

        {/* Manage Students Dialog */}
        <Dialog open={showStudentsDialog} onOpenChange={setShowStudentsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Students - {selectedClass?.name}</DialogTitle>
              <DialogDescription>
                Add or remove students from this class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Current Students */}
              <div>
                <h3 className="font-medium mb-2">Current Students</h3>
                {selectedClass?.students_data?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClass.students_data.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span>
                          {student.full_name} ({student.email})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No students enrolled</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    
  );
}
