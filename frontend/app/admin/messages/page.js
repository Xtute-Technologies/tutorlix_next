'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import DataTable from '@/components/DataTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contactMessageAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import { Mail, Trash2, Eye, UserPlus, CheckCircle2 } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
      const [messagesData, usersData] = await Promise.all([
        contactMessageAPI.getAll(),
        authService.getAllUsers(),
      ]);

      setMessages(Array.isArray(messagesData) ? messagesData : []);
      setUsers(Array.isArray(usersData?.results) ? usersData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setMessages([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (msg) => {
    setSelectedMessage(msg);
    setShowViewDialog(true);
  };

  const handleStatusChange = async (status) => {
    if (!selectedMessage) return;

    try {
      setUpdating(true);
      await contactMessageAPI.update(selectedMessage.id, { status });
      setMessage({ type: 'success', text: 'Status updated successfully!' });
      fetchData();
      setSelectedMessage(prev => ({ ...prev, status }));
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (userId) => {
    if (!selectedMessage) return;

    try {
      setUpdating(true);
      
      // Handle "unassigned" special value
      const assignedUserId = userId === 'unassigned' ? null : parseInt(userId);
      
      await contactMessageAPI.assign(selectedMessage.id, assignedUserId);
      setMessage({ type: 'success', text: userId === 'unassigned' ? 'Message unassigned successfully!' : 'Message assigned successfully!' });
      fetchData();
      
      const assignedUser = userId === 'unassigned' ? null : users.find(u => u.id === parseInt(userId));
      setSelectedMessage(prev => ({
        ...prev,
        assigned_to: assignedUserId,
        assigned_to_name: assignedUser?.full_name || '',
      }));
    } catch (error) {
      console.error('Assign error:', error);
      setMessage({ type: 'error', text: 'Failed to assign message' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await contactMessageAPI.delete(id);
      setMessage({ type: 'success', text: 'Message deleted successfully!' });
      fetchData();
      if (selectedMessage?.id === id) {
        setShowViewDialog(false);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete message',
      });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      new: 'bg-blue-600',
      in_progress: 'bg-yellow-600',
      resolved: 'bg-green-600',
      closed: 'bg-gray-600',
    };
    const labels = {
      new: 'New',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return (
      <Badge className={variants[status]}>
        {labels[status] || status}
      </Badge>
    );
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-sm text-gray-600">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.subject}>
          {row.original.subject}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'assigned_to_name',
      header: 'Assigned To',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assigned_to_name || <span className="text-gray-400">Unassigned</span>}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
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
            onClick={() => handleView(row.original)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-gray-600 mt-1">Manage contact form submissions</p>
          </div>
        </div>

        {message.text && (
          <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message.text}
          </Card>
        )}
          <DataTable
            columns={columns}
            data={messages}
            loading={loading}
            searchKey="name"
            searchPlaceholder="Search by name or email..."
          />

        {/* View Message Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
              <DialogDescription>
                Submitted on {selectedMessage && new Date(selectedMessage.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {selectedMessage && (
              <div className="space-y-6">
                {/* Contact Info */}
                <Card className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Name</Label>
                      <p className="font-medium">{selectedMessage.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p className="font-medium">{selectedMessage.email}</p>
                    </div>
                    {selectedMessage.phone && (
                      <div>
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <p className="font-medium">{selectedMessage.phone}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                    </div>
                  </div>
                </Card>

                {/* Subject */}
                <div>
                  <Label>Subject</Label>
                  <p className="mt-1 text-lg font-semibold">{selectedMessage.subject}</p>
                </div>

                {/* Message */}
                <div>
                  <Label>Message</Label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Management Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="status" className="mb-2 block">
                      <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      Update Status
                    </Label>
                    <Select
                      value={selectedMessage.status}
                      onValueChange={handleStatusChange}
                      disabled={updating}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assign" className="mb-2 block">
                      <UserPlus className="h-4 w-4 inline mr-1" />
                      Assign To
                    </Label>
                    <Select
                      value={selectedMessage.assigned_to?.toString() || 'unassigned'}
                      onValueChange={handleAssign}
                      disabled={updating}
                    >
                      <SelectTrigger id="assign">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.full_name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowViewDialog(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedMessage.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Message
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
