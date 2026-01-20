'use client';

import { useEffect, useState, useMemo } from 'react';

import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { offerAPI, productAPI } from '@/lib/lmsService';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { z } from 'zod';

const offerSchema = z.object({
  voucher_name: z.string().min(1, 'Voucher name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  product: z.string().min(1, 'Product is required'),
  amount_off: z.string().min(1, 'Amount off is required'),
  is_active: z.boolean().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  max_usage: z.string().optional(),
});

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Preview dialog states
  const [previewOffer, setPreviewOffer] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersData, productsData] = await Promise.all([
        offerAPI.getAll(),
        productAPI.getAll(),
      ]);
      // Ensure data is always an array
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setOffers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const offerData = {
        ...data,
        code: data.code.toUpperCase(),
        amount_off: data.amount_off,
        max_usage: data.max_usage ? Number(data.max_usage) : null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      };

      if (editingOffer) {
        await offerAPI.update(editingOffer.id, offerData);
        setMessage({ type: 'success', text: 'Offer updated successfully!' });
      } else {
        await offerAPI.create(offerData);
        setMessage({ type: 'success', text: 'Offer created successfully!' });
      }

      fetchData();
      setShowForm(false);
      setEditingOffer(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save offer',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (offer) => {
    try {
      setLoading(true);
      const fullOffer = await offerAPI.getById(offer.id);
      
      // Format dates for the form
      const formattedOffer = {
        ...fullOffer,
        valid_from: fullOffer.valid_from ? new Date(fullOffer.valid_from).toISOString().split('T')[0] : '',
        valid_to: fullOffer.valid_to ? new Date(fullOffer.valid_to).toISOString().split('T')[0] : '',
      };
      
      setEditingOffer(formattedOffer);
      setShowForm(true);
      setMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error fetching offer details:', err);
      setMessage({ type: 'error', text: 'Failed to load offer details' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (offer) => {
    try {
      setLoading(true);
      const fullOffer = await offerAPI.getById(offer.id);
      setPreviewOffer(fullOffer);
      setShowPreview(true);
    } catch (err) {
      console.error('Error fetching offer details:', err);
      setMessage({ type: 'error', text: 'Failed to load offer details' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      await offerAPI.delete(id);
      setMessage({ type: 'success', text: 'Offer deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete offer',
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOffer(null);
    setMessage({ type: '', text: '' });
  };

  // Use useMemo to ensure products is always an array before mapping
  const offerFields = useMemo(() => [
    {
      name: 'voucher_name',
      label: 'Voucher Name',
      type: 'text',
      placeholder: 'Enter voucher name',
      required: true,
    },
    {
      name: 'code',
      label: 'Coupon Code',
      type: 'text',
      placeholder: 'Enter coupon code (e.g., SUMMER2024)',
      required: true,
    },
    {
      name: 'product',
      label: 'Product',
      type: 'select',
      placeholder: 'Select product',
      options: Array.isArray(products) ? products.map((prod) => ({
        label: `${prod.name} - ₹${prod.effective_price || prod.price}`,
        value: prod.id?.toString() || '',
      })) : [],
      required: true,
    },
    {
      name: 'amount_off',
      label: 'Discount Amount (₹)',
      type: 'text',
      placeholder: 'Enter discount amount',
      required: true,
    },
    {
      name: 'valid_from',
      label: 'Valid From',
      type: 'date',
      placeholder: 'Select start date',
    },
    {
      name: 'valid_to',
      label: 'Valid To',
      type: 'date',
      placeholder: 'Select end date',
    },
    {
      name: 'max_usage',
      label: 'Max Usage',
      type: 'number',
      placeholder: 'Enter max usage limit (optional)',
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
    },
  ], [products]); // Recalculate when products changes

  const columns = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <div className="font-mono font-semibold text-blue-600">
          {row.original.code}
        </div>
      ),
    },
    {
      accessorKey: 'voucher_name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.voucher_name}</div>
          <div className="text-sm text-gray-500">{row.original.product_name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'amount_off',
      header: 'Discount',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          ₹{row.original.amount_off} OFF
        </div>
      ),
    },
    {
      accessorKey: 'usage_info',
      header: 'Usage',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.usage_info}</Badge>
      ),
    },
    {
      accessorKey: 'is_valid_now',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_valid_now ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">Valid</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600 font-medium">Expired/Inactive</span>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'valid_to',
      header: 'Expires',
      cell: ({ row }) => (
        <div className="text-gray-600">
          {row.original.valid_to
            ? new Date(row.original.valid_to).toLocaleDateString()
            : 'No expiry'}
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
            onClick={() => handlePreview(row.original)}
            title="Preview Offer"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="h-4 w-4" />
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
            <h1 className="text-3xl font-bold text-gray-900">Offers & Vouchers</h1>
            <p className="text-gray-600 mt-1">Manage discount codes and offers</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Offer
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

        {/* Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingOffer ? 'Edit Offer' : 'Add New Offer'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormBuilder
                fields={offerFields}
                validationSchema={offerSchema}
                onSubmit={handleSubmit}
                submitLabel={editingOffer ? 'Update Offer' : 'Create Offer'}
                isSubmitting={submitting}
                defaultValues={
                  editingOffer
                    ? {
                        ...editingOffer,
                        product: editingOffer.product?.toString(),
                        valid_from: editingOffer.valid_from?.split('T')[0],
                        valid_to: editingOffer.valid_to?.split('T')[0],
                      }
                    : { is_active: true }
                }
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
            <DataTable
              columns={columns}
              data={offers}
              searchPlaceholder="Search offers..."
            />


        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Offer Preview</DialogTitle>
              <DialogDescription>Complete offer information</DialogDescription>
            </DialogHeader>
            {previewOffer && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{previewOffer.voucher_name}</h2>
                    <p className="text-lg font-mono text-primary mt-1">{previewOffer.code}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        previewOffer.is_valid_now
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {previewOffer.is_valid_now ? 'Active' : 'Expired'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div>
                    <Label className="text-muted-foreground">Product</Label>
                    <p className="font-semibold mt-1">{previewOffer.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Product Price</Label>
                    <p className="font-semibold mt-1">₹{previewOffer.product_current_price}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Discount Amount</Label>
                    <p className="text-2xl font-bold text-green-600 mt-1">₹{previewOffer.amount_off}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Final Price</Label>
                    <p className="text-2xl font-bold text-primary mt-1">
                      ₹{(parseFloat(previewOffer.product_current_price) - parseFloat(previewOffer.amount_off)).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div>
                    <Label className="text-muted-foreground">Valid From</Label>
                    <p className="font-semibold mt-1">
                      {new Date(previewOffer.valid_from).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valid Until</Label>
                    <p className="font-semibold mt-1">
                      {new Date(previewOffer.valid_to).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Usage</Label>
                    <p className="font-semibold mt-1">{previewOffer.usage_info}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p>
                      <Badge
                        className={
                          previewOffer.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {previewOffer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreview(false);
                      handleEdit(previewOffer);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Offer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    
  );
}
