'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Plus, Edit, Trash2, Eye, ReceiptText, ExternalLink } from 'lucide-react';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import CopyButton from '@/components/ui/copy-button';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { adhocPaymentAPI } from '@/lib/lmsService';

const adhocPaymentSchema = z.object({
  title: z.string().min(1, 'Payment title is required'),
  client_name: z.string().min(1, 'Client name is required'),
  client_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  amount: z.string().min(1, 'Amount is required'),
  international: z.boolean().optional(),
  description: z.string().optional().or(z.literal('')),
  payment_status: z.string().optional(),
});

const formatCurrency = (value, currency = 'INR') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const paymentAmount = (payment) => formatCurrency(
  payment?.payment_amount ?? payment?.amount,
  payment?.payment_currency || 'INR'
);

const statusClasses = {
  pending: 'bg-yellow-600',
  paid: 'bg-green-600',
  failed: 'bg-red-600',
  refunded: 'bg-gray-600',
  expired: 'bg-slate-600',
};

function PaymentStatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return <Badge className={statusClasses[status] || 'bg-gray-600'}>{label}</Badge>;
}

export default function AdhocPaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchPayments();
  }, [user, router]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await adhocPaymentAPI.getAll();
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch adhoc payments:', error);
      setMessage({ type: 'error', text: 'Failed to fetch adhoc payments' });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        international: !!data.international,
        payment_status: data.payment_status || 'pending',
      };

      if (editingId) {
        await adhocPaymentAPI.update(editingId, payload);
        setMessage({ type: 'success', text: 'Adhoc payment updated.' });
      } else {
        await adhocPaymentAPI.create(payload);
        setMessage({ type: 'success', text: 'Adhoc payment link created.' });
      }

      setShowForm(false);
      setEditingId(null);
      fetchPayments();
    } catch (error) {
      console.error('Failed to save adhoc payment:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || error.response?.data?.amount?.[0] || 'Failed to save adhoc payment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this adhoc payment link?')) return;
    try {
      await adhocPaymentAPI.delete(id);
      setMessage({ type: 'success', text: 'Adhoc payment deleted.' });
      fetchPayments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete adhoc payment' });
    }
  };

  const handleBulkDelete = async (rows) => {
    const results = await Promise.allSettled(rows.map((row) => adhocPaymentAPI.delete(row.id)));
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    setMessage(
      failedCount
        ? { type: 'error', text: `${failedCount} payment(s) could not be deleted.` }
        : { type: 'success', text: `${rows.length} payment(s) deleted.` }
    );
    fetchPayments();
  };

  const handleEdit = (payment) => {
    setEditingId(payment.id);
    setShowForm(true);
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewDialog(true);
  };

  const formFields = [
    { name: 'title', label: 'Payment For', type: 'text', required: true, placeholder: 'Website development' },
    { name: 'client_name', label: 'Client Name', type: 'text', required: true, placeholder: 'Client name' },
    { name: 'client_email', label: 'Client Email', type: 'email', required: false, placeholder: 'client@example.com' },
    { name: 'client_phone', label: 'Client Phone', type: 'tel', required: false, placeholder: '9876543210' },
    { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '0.00' },
    {
      name: 'international',
      label: 'International',
      type: 'checkbox',
      required: false,
      placeholder: 'Charge this payment in USD',
    },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4, required: false, placeholder: 'Scope, invoice notes, or payment purpose' },
    {
      name: 'payment_status',
      label: 'Payment Status',
      type: 'select',
      required: false,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' },
        { value: 'refunded', label: 'Refunded' },
        { value: 'expired', label: 'Expired' },
      ],
    },
  ];

  const editingPayment = editingId ? payments.find((payment) => payment.id === editingId) : null;
  const defaultValues = editingPayment
    ? { ...editingPayment, amount: String(editingPayment.amount || '') }
    : { payment_status: 'pending', international: false };

  const paidTotal = payments.reduce((sum, payment) => {
    if (payment.payment_status !== 'paid') return sum;
    return sum + parseFloat(payment.amount || 0);
  }, 0);

  const columns = [
    {
      accessorKey: 'title',
      header: 'Payment',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-sm text-gray-600">{row.original.client_name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{paymentAmount(row.original)}</div>
          {row.original.international && (
            <div className="text-xs text-gray-600">{formatCurrency(row.original.amount, 'INR')} source</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'international',
      header: 'International',
      cell: ({ row }) => (
        <Badge className={row.original.international ? 'bg-blue-600' : 'bg-gray-600'}>
          {row.original.international ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
      cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} />,
    },
    {
      accessorKey: 'payment_link',
      header: 'Payment Link',
      cell: ({ row }) => (
        row.original.payment_link ? (
          <div className="flex items-center gap-2">
            <CopyButton text={row.original.payment_link} />
            <Button variant="ghost" size="sm" asChild>
              <a href={row.original.payment_link} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : <span className="text-sm text-gray-500">Not generated</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => <span className="text-sm text-gray-600">{new Date(row.original.created_at).toLocaleDateString()}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleView(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)} className="text-red-600 hover:text-red-700">
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
          <h1 className="text-3xl font-bold">Adhoc Payments</h1>
          <p className="text-gray-600 mt-1">Collect client payments outside course bookings.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Payment Link
        </Button>
      </div>

      {message.text && (
        <Card className={`p-4 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message.text}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-gray-600">Total Links</p>
          <p className="text-2xl font-bold mt-1">{payments.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold mt-1">{payments.filter((payment) => payment.payment_status === 'pending').length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-600">Paid Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(paidTotal, 'INR')}</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        searchPlaceholder="Search by client or payment purpose..."
        onBulkDelete={handleBulkDelete}
        bulkDeleteLabel="Delete selected"
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Adhoc Payment' : 'Create Adhoc Payment'}</DialogTitle>
            <DialogDescription>
              Admin-only payment collection for services like website development, consulting, or custom work.
            </DialogDescription>
          </DialogHeader>
          <FormBuilder
            fields={formFields}
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
            submitLabel={editingId ? 'Update' : 'Create Link'}
            submitting={submitting}
            schema={adhocPaymentSchema}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adhoc Payment Details</DialogTitle>
            <DialogDescription>{selectedPayment?.payment_id}</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div><span className="text-gray-600">Payment For:</span> <span className="font-medium">{selectedPayment.title}</span></div>
                  <div><span className="text-gray-600">Client:</span> <span className="font-medium">{selectedPayment.client_name}</span></div>
                  <div><span className="text-gray-600">Email:</span> <span className="font-medium">{selectedPayment.client_email || 'N/A'}</span></div>
                  <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{selectedPayment.client_phone || 'N/A'}</span></div>
                  <div><span className="text-gray-600">Amount:</span> <span className="font-bold">{paymentAmount(selectedPayment)}</span></div>
                  {selectedPayment.international && (
                    <div><span className="text-gray-600">Source Amount:</span> <span className="font-medium">{formatCurrency(selectedPayment.amount, 'INR')}</span></div>
                  )}
                  <div><span className="text-gray-600">Status:</span> <PaymentStatusBadge status={selectedPayment.payment_status} /></div>
                </div>
                {selectedPayment.description && <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">{selectedPayment.description}</p>}
              </Card>

              {selectedPayment.payment_link && (
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Payment Link</p>
                      <p className="truncate text-sm text-blue-600">{selectedPayment.payment_link}</p>
                    </div>
                    <CopyButton text={selectedPayment.payment_link} />
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Payment History</h3>
                {Array.isArray(selectedPayment.payment_histories) && selectedPayment.payment_histories.length > 0 ? (
                  <div className="divide-y rounded-md border">
                    {selectedPayment.payment_histories.map((history) => (
                      <div key={history.id} className="flex items-center justify-between p-3 text-sm">
                        <div>
                          <div className="font-medium">{formatCurrency(history.charged_amount ?? history.amount, history.currency || 'INR')}</div>
                          {history.currency !== 'INR' && <div className="text-xs text-gray-500">Source: {formatCurrency(history.amount, 'INR')}</div>}
                          <div className="text-xs text-gray-500">{new Date(history.created_at).toLocaleString()}</div>
                          {history.razorpay_payment_id && <div className="text-xs text-gray-400">Payment ID: {history.razorpay_payment_id}</div>}
                        </div>
                        <PaymentStatusBadge status={history.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No payment attempts yet.</div>
                )}
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
