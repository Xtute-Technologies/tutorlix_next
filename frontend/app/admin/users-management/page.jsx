'use client';

import { useEffect, useState, useMemo } from 'react';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authService } from '@/lib/authService';
import { Plus, Pencil, Trash2, Calendar, Loader2 } from 'lucide-react';
import { z } from 'zod';

// --- Schemas ---
const createUserSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email(),
  username: z.string().min(3),
  phone: z.string().min(10),
  password: z.string().min(8),
  role: z.enum(['student', 'teacher', 'seller', 'admin']),
  is_active: z.boolean().optional(),
  profile_image: z.any().optional(),
});

const editUserSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum(['student', 'teacher', 'seller', 'admin']),
  is_active: z.boolean().optional(),
  profile_image: z.any().optional(),
});

export default function UsersPage() {
  // Data State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Pagination State
  const [currentRole, setCurrentRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [currentRole, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authService.getAllUsers({
        role: currentRole,
        page: currentPage,
      });
      
      if (response.results) {
        setUsers(response.results);
        setTotalCount(response.count);
        setTotalPages(Math.ceil(response.count / 10)); 
      } else {
        setUsers(Array.isArray(response) ? response : []);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const formData = new FormData();
      
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (key === 'profile_image') {
          if (value instanceof FileList && value.length > 0) {
            formData.append(key, value[0]);
          } else if (value instanceof File) {
            formData.append(key, value);
          }
        } else if (typeof value === 'boolean') {
           formData.append(key, value.toString());
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value);
        }
      });

      if (editingUser) {
        await authService.updateUser(editingUser.id, formData);
        setMessage({ type: 'success', text: 'User updated successfully!' });
      } else {
        await authService.createUser(formData);
        setMessage({ type: 'success', text: 'User created successfully!' });
      }

      handleCancel();
      fetchUsers();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save user.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- DELETE LOGIC ---
  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await authService.deleteUser(userToDelete);
      setMessage({ type: 'success', text: 'Deleted successfully' });
      fetchUsers();
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to delete user' });
    } finally {
      setUserToDelete(null); // Close dialog
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setMessage({ type: '', text: '' });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // --- Form Config ---
  const userFields = useMemo(() => {
    const fields = [
      { name: 'profile_image', label: 'Profile Photo', type: 'file', accept: 'image/*', className: "col-span-1 md:col-span-2" },
      { name: 'first_name', label: 'First Name', type: 'text', required: true },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { 
        name: 'role', label: 'Role', type: 'select', required: true,
        options: [
          { label: 'Student', value: 'student' },
          { label: 'Teacher', value: 'teacher' },
          { label: 'Seller', value: 'seller' },
          { label: 'Admin', value: 'admin' },
        ]
      },
      { name: 'is_active', label: 'Active', type: 'checkbox' },
    ];

    if (!editingUser) {
      fields.splice(1, 0, { name: 'username', label: 'Username', type: 'text', required: true });
      fields.push({ name: 'password', label: 'Password', type: 'password', required: true });
    }
    return fields;
  }, [editingUser]);

  // --- Columns ---
  const columns = [
    {
      accessorKey: 'full_name', header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={row.original.profile_image} className="object-cover" />
            <AvatarFallback>{row.original.first_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm text-slate-900">{row.original.full_name || row.original.username}</span>
            <span className="text-xs text-slate-500">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    { 
      accessorKey: 'role', header: 'Role', 
      cell: ({ row }) => {
        const role = row.original.role;
        const style = {
          admin: 'bg-red-50 text-red-700 border-red-100',
          teacher: 'bg-blue-50 text-blue-700 border-blue-100',
          seller: 'bg-purple-50 text-purple-700 border-purple-100',
          student: 'bg-green-50 text-green-700 border-green-100',
        }[role] || 'bg-gray-50';
        
        return <Badge variant="outline" className={`${style} capitalize`}>{role}</Badge>;
      }
    },
    { 
        accessorKey: 'created_at', header: 'Joined', 
        cell: ({ row }) => (
            <div className="flex items-center text-slate-500 text-xs">
                <Calendar className="w-3 h-3 mr-1.5" />
                {new Date(row.original.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
        )
    },
    { 
      accessorKey: 'is_active', header: 'Status', 
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'} className={row.original.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge> 
      )
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil className="h-4 w-4 text-slate-400 hover:text-blue-600" /></Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setUserToDelete(row.original.id)} // Open Alert Dialog
          >
            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system access and roles.</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setShowForm(true); }} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-md text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Role Tabs */}
      <Tabs defaultValue="all" value={currentRole} onValueChange={(val) => { setCurrentRole(val); setCurrentPage(1); }} className="w-full">
        <TabsList className="bg-slate-100 p-1">
          {['all', 'student', 'teacher', 'seller', 'admin'].map((role) => (
             <TabsTrigger key={role} value={role} className="capitalize data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {role}
             </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pageCount={totalPages} 
        pageIndex={currentPage - 1} 
        onPageChange={(idx) => handlePageChange(idx + 1)} 
        searchKey="username"
        searchPlaceholder="Search by username..."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create Account'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FormBuilder
              fields={userFields}
              validationSchema={editingUser ? editUserSchema : createUserSchema}
              onSubmit={handleSubmit}
              submitLabel={editingUser ? 'Save Changes' : 'Create User'}
              isSubmitting={submitting}
              defaultValues={editingUser || { is_active: true, role: currentRole === 'all' ? 'student' : currentRole }}
              onCancel={handleCancel}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}