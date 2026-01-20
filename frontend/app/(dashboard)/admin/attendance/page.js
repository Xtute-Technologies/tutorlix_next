'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import DataTable from '@/components/DataTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { attendanceAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Plus, Trash2, ClipboardCheck, Eye } from 'lucide-react';

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classAttendances, setClassAttendances] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    class_name: '',
    class_time: '',
    date: new Date().toISOString().split('T')[0],
    selectedStudents: [],
  });

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
      const [attendanceData, studentsData] = await Promise.all([
        attendanceAPI.getAll(),
        authService.getAllUsers({ role: 'student' }),
      ]);
      
      setAttendances(Array.isArray(attendanceData) ? attendanceData : []);
      setStudents(Array.isArray(studentsData?.results) ? studentsData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setAttendances([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.class_name || !formData.class_time || !formData.date) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    if (formData.selectedStudents.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one student' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      // Create attendance records for each selected student
      const promises = formData.selectedStudents.map(async (studentData) => {
        return attendanceAPI.create({
          class_name: formData.class_name,
          class_time: formData.class_time,
          date: formData.date,
          student: studentData.id,
          status: studentData.status,
          remarks: studentData.remarks || '',
        });
      });

      await Promise.all(promises);
      
      setMessage({ type: 'success', text: 'Attendance marked successfully!' });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save attendance',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentToggle = (student) => {
    const exists = formData.selectedStudents.find(s => s.id === student.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        selectedStudents: prev.selectedStudents.filter(s => s.id !== student.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedStudents: [...prev.selectedStudents, { id: student.id, name: student.full_name, status: 'P', remarks: '' }]
      }));
    }
  };

  const handleStatusChange = (studentId, status) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.map(s =>
        s.id === studentId ? { ...s, status } : s
      )
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.map(s =>
        s.id === studentId ? { ...s, remarks } : s
      )
    }));
  };

  const handleViewAttendance = async (className, classTime, date) => {
    try {
      // Fetch all attendances for this specific class
      const allAttendances = await attendanceAPI.getAll();
      const filtered = allAttendances.filter(
        a => a.class_name === className && a.class_time === classTime && a.date === date
      );
      setClassAttendances(filtered);
      setSelectedClass({ class_name: className, class_time: classTime, date });
      setShowViewDialog(true);
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      setMessage({ type: 'error', text: 'Failed to load attendance details' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      await attendanceAPI.delete(id);
      setMessage({ type: 'success', text: 'Attendance deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete attendance',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      class_name: '',
      class_time: '',
      date: new Date().toISOString().split('T')[0],
      selectedStudents: [],
    });
  };

  // Group attendances by class
  const groupedAttendances = useMemo(() => {
    const groups = {};
    attendances.forEach(att => {
      const key = `${att.class_name}-${att.class_time}-${att.date}`;
      if (!groups[key]) {
        groups[key] = {
          class_name: att.class_name,
          class_time: att.class_time,
          date: att.date,
          students: [],
          present: 0,
          absent: 0,
          partial: 0,
        };
      }
      groups[key].students.push(att);
      if (att.status === 'P') groups[key].present++;
      if (att.status === 'AB') groups[key].absent++;
      if (att.status === 'Partial') groups[key].partial++;
    });
    return Object.values(groups);
  }, [attendances]);

  const columns = [
    {
      accessorKey: 'class_name',
      header: 'Class Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-gray-400" />
          <div className="font-medium">{row.original.class_name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'class_time',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">{row.original.class_time}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'attendance',
      header: 'Attendance',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Badge variant="default" className="bg-green-600">
            {row.original.present} Present
          </Badge>
          <Badge variant="destructive">
            {row.original.absent} Absent
          </Badge>
          {row.original.partial > 0 && 
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              {row.original.partial} Partial
            </Badge>
          }
        </div>
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
            onClick={() => handleViewAttendance(row.original.class_name, row.original.class_time, row.original.date)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-gray-600 mt-1">Manage student attendance records</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
        </div>

        {message.text && (
          <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message.text}
          </Card>
        )}

          <DataTable
            columns={columns}
            data={groupedAttendances}
            loading={loading}
            searchKey="class_name"
            searchPlaceholder="Search by class name..."
          />

        {/* Mark Attendance Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Select students and mark their attendance status
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class_name">Class Name *</Label>
                  <Input
                    id="class_name"
                    value={formData.class_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
                    placeholder="e.g., Advanced Mathematics"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="class_time">Class Time *</Label>
                  <Input
                    id="class_time"
                    value={formData.class_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, class_time: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 11:30 AM"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label className="mb-2 block">Select Students *</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {students.map((student) => {
                    const isSelected = formData.selectedStudents.find(s => s.id === student.id);
                    return (
                      <div key={student.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => handleStudentToggle(student)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{student.full_name} ({student.email})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {formData.selectedStudents.length > 0 && (
                <div>
                  <Label className="mb-2 block">Mark Status</Label>
                  <div className="space-y-3">
                    {formData.selectedStudents.map((studentData) => (
                      <div key={studentData.id} className="p-3 border rounded-lg space-y-2">
                        <div className="font-medium">{studentData.name}</div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={studentData.status === 'P' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(studentData.id, 'P')}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            variant={studentData.status === 'AB' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(studentData.id, 'AB')}
                          >
                            Absent
                          </Button>
                          <Button
                            type="button"
                            variant={studentData.status === 'Partial' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusChange(studentData.id, 'Partial')}
                          >
                            Partial
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Remarks (optional)"
                          value={studentData.remarks}
                          onChange={(e) => handleRemarksChange(studentData.id, e.target.value)}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || formData.selectedStudents.length === 0}>
                  {submitting ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Attendance Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Attendance Details - {selectedClass?.class_name}</DialogTitle>
              <DialogDescription>
                {selectedClass?.class_time} | {selectedClass && new Date(selectedClass.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {classAttendances.length > 0 ? (
                classAttendances.map((att) => (
                  <div key={att.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{att.student_name}</div>
                      <div className="text-sm text-gray-600">{att.student_email}</div>
                      {att.remarks && <div className="text-sm text-gray-500 mt-1">{att.remarks}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={att.status === 'P' ? 'default' : att.status === 'Partial' ? 'secondary' : 'destructive'}
                          className={att.status === 'Partial' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                      >
                        {att.status === 'P' ? 'Present' : att.status === 'Partial' ? 'Partial' : 'Absent'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(att.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No attendance records found for this class.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    
  );
}
