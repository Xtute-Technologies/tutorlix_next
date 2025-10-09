'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { productAPI, categoryAPI } from '@/lib/lmsService';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Eye, X } from 'lucide-react';
import { z } from 'zod';
import Image from 'next/image';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  total_seats: z.coerce.number().min(1, 'Total seats must be at least 1'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  discounted_price: z.coerce.number().positive('Discounted price must be greater than 0').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Image upload states
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Preview dialog states
  const [previewProduct, setPreviewProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
      ]);
      // Ensure data is always an array
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      // Convert string prices to numbers
      const productData = {
        ...data,
        total_seats: Number(data.total_seats),
        price: data.price,
        discounted_price: data.discounted_price || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      };

      if (editingProduct) {
        await productAPI.update(editingProduct.id, productData);
        
        // Upload new images if any
        if (selectedImages.length > 0) {
          await uploadImages(editingProduct.id);
        }
        
        setMessage({ type: 'success', text: 'Product updated successfully!' });
      } else {
        const newProduct = await productAPI.create(productData);
        
        // Upload images for new product
        if (selectedImages.length > 0) {
          await uploadImages(newProduct.id);
        }
        
        setMessage({ type: 'success', text: 'Product created successfully!' });
      }

      setShowForm(false);
      setEditingProduct(null);
      setSelectedImages([]);
      setImagePreviews([]);
      setExistingImages([]);
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save product',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (product) => {
    try {
      setLoading(true);
      // Fetch full product details including images
      const fullProduct = await productAPI.getById(product.id);
      setEditingProduct(fullProduct);
      setExistingImages(fullProduct.images || []);
      setShowForm(true);
    } catch (err) {
      console.error('Error fetching product details:', err);
      setMessage({ type: 'error', text: 'Failed to load product details' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (product) => {
    try {
      setLoading(true);
      const fullProduct = await productAPI.getById(product.id);
      setPreviewProduct(fullProduct);
      setShowPreview(true);
    } catch (err) {
      console.error('Error fetching product details:', err);
      setMessage({ type: 'error', text: 'Failed to load product details' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + existingImages.length + selectedImages.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 images allowed per product' });
      return;
    }

    setSelectedImages([...selectedImages, ...files]);

    // Create previews
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeSelectedImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke URL to free memory
    URL.revokeObjectURL(imagePreviews[index].url);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await productAPI.deleteImage(editingProduct.id, imageId);
      setExistingImages(existingImages.filter(img => img.id !== imageId));
      setMessage({ type: 'success', text: 'Image deleted successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error deleting image:', err);
      setMessage({ type: 'error', text: 'Failed to delete image' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const setPrimaryImage = async (imageId) => {
    if (!editingProduct) return;
    
    try {
      await productAPI.setPrimaryImage(editingProduct.id, imageId);
      
      // Update local state
      setExistingImages(existingImages.map(img => ({
        ...img,
        is_primary: img.id === imageId
      })));
      
      setMessage({ type: 'success', text: 'Primary image updated successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error setting primary image:', err);
      setMessage({ type: 'error', text: 'Failed to set primary image' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const uploadImages = async (productId) => {
    if (selectedImages.length === 0) return;

    setUploadingImages(true);
    try {
      // Upload all images at once
      await productAPI.uploadImages(productId, selectedImages);
      
      setMessage({ type: 'success', text: 'Images uploaded successfully' });
      setSelectedImages([]);
      setImagePreviews([]);
      
      // Refresh product data to show new images
      const updatedProduct = await productAPI.getById(productId);
      setExistingImages(updatedProduct.images || []);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error uploading images:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload images' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    
    // Cleanup preview URLs
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
  };

  const handleImageUpload = async (productId, files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      setMessage({ type: '', text: '' });

      await productAPI.uploadImages(productId, Array.from(files));
      setMessage({ type: 'success', text: 'Images uploaded successfully!' });
      fetchData();
      setSelectedProduct(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to upload images',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productAPI.delete(id);
      setMessage({ type: 'success', text: 'Product deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to delete product',
      });
    }
  };

  // Use useMemo to ensure categories is always an array before mapping
  const productFields = useMemo(() => [
    {
      name: 'name',
      label: 'Product Name',
      type: 'text',
      placeholder: 'Enter product name',
      required: true,
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      placeholder: 'Select category',
      options: Array.isArray(categories) ? categories.map((cat) => ({
        label: cat.name,
        value: cat.id?.toString() || '',
      })) : [],
      required: true,
    },
    {
      name: 'total_seats',
      label: 'Total Seats',
      type: 'number',
      placeholder: 'Enter total seats',
      required: true,
    },
    {
      name: 'price',
      label: 'Price (₹)',
      type: 'number',
      placeholder: 'Enter price',
      required: true,
    },
    {
      name: 'discounted_price',
      label: 'Discounted Price (₹)',
      type: 'number',
      placeholder: 'Enter discounted price (optional)',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter product description',
      required: true,
    },
    {
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
    },
  ], [categories]); // Recalculate when categories changes

  const columns = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.primary_image ? (
            <img
              src={row.original.primary_image}
              alt={row.original.name}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-sm text-gray-500">{row.original.category_name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">₹{row.original.effective_price}</div>
          {row.original.discounted_price && (
            <div className="text-sm text-gray-500 line-through">
              ₹{row.original.price}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'total_seats',
      header: 'Seats',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.total_seats} seats</Badge>
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
            onClick={() => handlePreview(row.original)}
            title="Preview Product"
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
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">Manage products and courses</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
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
              <CardTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </CardTitle>
              <CardDescription>
                {editingProduct ? 'Update product information and images' : 'Create a new product with up to 5 images'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="details">Product Details</TabsTrigger>
                  <TabsTrigger value="images">
                    Images ({existingImages.length + selectedImages.length}/5)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <FormBuilder
                    fields={productFields}
                    validationSchema={productSchema}
                    onSubmit={handleSubmit}
                    submitLabel={editingProduct ? 'Update Product' : 'Create Product'}
                    isSubmitting={submitting}
                    defaultValues={
                      editingProduct
                        ? {
                            ...editingProduct,
                            category: editingProduct.category?.toString(),
                          }
                        : { is_active: true }
                    }
                    onCancel={handleCancel}
                  />
                </TabsContent>

                <TabsContent value="images">
                  <div className="space-y-6">
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div>
                        <Label className="text-base">Current Images</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                          {existingImages.map((image) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.image_url || image.image}
                                alt="Product"
                                className="w-full h-32 object-cover rounded-lg border-2 border-border"
                              />
                              {image.is_primary && (
                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                  Primary
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                {!image.is_primary && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setPrimaryImage(image.id)}
                                    className="text-xs"
                                  >
                                    Set Primary
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeExistingImage(image.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Images Preview */}
                    {imagePreviews.length > 0 && (
                      <div>
                        <Label className="text-base">New Images (Not yet uploaded)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview.url}
                                alt={preview.name}
                                className="w-full h-32 object-cover rounded-lg border-2 border-dashed border-primary"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => removeSelectedImage(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload Section */}
                    {existingImages.length + selectedImages.length < 5 && (
                      <div>
                        <Label htmlFor="images" className="text-base">
                          Add Images (Max 5 total)
                        </Label>
                        <div className="mt-4 flex items-center gap-4">
                          <Input
                            id="images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {5 - existingImages.length - selectedImages.length} remaining
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    {selectedImages.length > 0 && editingProduct && (
                      <Button
                        onClick={() => uploadImages(editingProduct.id)}
                        disabled={uploadingImages}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImages ? 'Uploading...' : `Upload ${selectedImages.length} Image(s)`}
                      </Button>
                    )}

                    {!editingProduct && (
                      <div className="p-4 bg-blue-50 text-blue-700 rounded-lg">
                        <p className="text-sm">
                          💡 Save the product details first, then you can upload images.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}

            <DataTable
              columns={columns}
              data={products}
              searchPlaceholder="Search products..."
            />


        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Preview</DialogTitle>
              <DialogDescription>Complete product information</DialogDescription>
            </DialogHeader>
            {previewProduct && (
              <div className="space-y-6">
                {/* Images Gallery */}
                {previewProduct.images && previewProduct.images.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Product Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {previewProduct.images.map((image) => (
                        <div key={image.id} className="relative">
                          <img
                            src={image.image_url || image.image}
                            alt="Product"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          {image.is_primary && (
                            <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-semibold">{previewProduct.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-semibold">{previewProduct.category_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Price</Label>
                    <p className="font-semibold">₹{previewProduct.price}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Discounted Price</Label>
                    <p className="font-semibold">
                      {previewProduct.discounted_price ? `₹${previewProduct.discounted_price}` : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Effective Price</Label>
                    <p className="font-semibold text-green-600">₹{previewProduct.effective_price}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Seats</Label>
                    <p className="font-semibold">{previewProduct.total_seats}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Discount</Label>
                    <p className="font-semibold">
                      {previewProduct.discount_percentage ? `${previewProduct.discount_percentage}%` : '0%'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p>
                      <Badge
                        className={
                          previewProduct.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {previewProduct.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{previewProduct.description}</p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreview(false);
                      handleEdit(previewProduct);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Product
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
