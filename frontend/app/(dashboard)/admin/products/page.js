'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { productAPI } from '@/lib/lmsService';
import {
  Plus, Pencil, Trash2, Eye, X,
  PlayCircle, FileText, CheckCircle2, Users
} from 'lucide-react';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

export default function ProductsPage() {
  const router = useRouter();
  // --- State ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Preview State
  const [previewProduct, setPreviewProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const productsData = await productAPI.getAll();
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleEdit = (product) => {
    router.push(`/admin/products/${product.id}`);
  };

  const handlePreview = async (product) => {
    try {
      // Fetch full details for preview (to get curriculum/instructors populated)
      const fullDetails = await productAPI.getById(product.id);
      setPreviewProduct(fullDetails);
      setShowPreview(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productAPI.delete(id);
      setMessage({ type: 'success', text: 'Product deleted successfully!' });
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete product' });
    }
  };

  const columns = [
    {
      accessorKey: 'name', header: 'Product', cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img src={row.original.images?.find(i=>i.is_primary)?.image_url || row.original.primary_image || FALLBACK_IMAGE} className="w-10 h-10 rounded object-cover" />
          <div><div className="font-medium truncate w-40">{row.original.name}</div><div className="text-xs text-gray-500">{row.original.category_name}</div></div>
        </div>
      )
    },
    { accessorKey: 'effective_price', header: 'Price', cell: ({ row }) => `₹${row.original.effective_price}` },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Draft'}</Badge> },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handlePreview(row.original)}><Eye className="h-4 w-4 text-blue-500" /></Button>
          <Link href={`/admin/products/${row.original.id}`}>
            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/products/new">
            <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
        </Link>
      </div>

      {message.text && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message.text}</div>}

      <DataTable columns={columns} data={products} loading={loading} searchKey="name" searchPlaceholder="Search products..." />

      {/* --- PREVIEW DIALOG (Mimics Public Page) --- */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 gap-0">


          {/* 1. Simple Header */}
          <div className="bg-slate-50 border-b px-6 py-4 sticky top-0 z-10 flex justify-between items-start">
            <div>
              <Badge variant="secondary" className="mb-2 bg-white border shadow-sm">
                {previewProduct?.category_name}
              </Badge>
              <DialogTitle>

                <h2 className="text-2xl font-bold text-slate-900">{previewProduct?.name}</h2>
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                <span className="font-bold text-slate-900 text-lg">
                  ₹{previewProduct?.effective_price}
                </span>
                {previewProduct?.discounted_price && (
                  <span className="line-through decoration-slate-400">
                    ₹{previewProduct?.price}
                  </span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {previewProduct?.total_seats} Seats
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* 2. Content Body */}
          {previewProduct && (
            <div className="p-6 space-y-6">

              {/* Simple Description Text */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {previewProduct.description}
                </p>
              </div>

              {/* Beautiful Tabs for Complex Data */}
              <Tabs defaultValue="curriculum" className="w-full border rounded-xl p-1 shadow-sm">
                <TabsList className="w-full grid grid-cols-3 bg-slate-100/50 p-1">
                  <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                  <TabsTrigger value="highlights">Highlights</TabsTrigger>
                  <TabsTrigger value="instructor">Instructor</TabsTrigger>
                </TabsList>

                <div className="p-4 bg-white min-h-[300px]">

                  {/* Curriculum Tab */}
                  <TabsContent value="curriculum" className="mt-0 space-y-4">
                    {(!previewProduct.curriculum || previewProduct.curriculum.length === 0) ? (
                      <div className="text-center py-10 text-slate-400 italic">
                        No curriculum added yet.
                      </div>
                    ) : (
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {previewProduct.curriculum.map((mod, i) => (
                          <AccordionItem key={i} value={`preview-mod-${i}`} className="border rounded-lg px-3 bg-slate-50/50">
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center gap-3 text-left">
                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                  {i + 1}
                                </div>
                                <span className="font-medium text-slate-800">{mod.title}</span>
                                <span className="text-xs text-slate-400 font-normal ml-2">
                                  ({mod.lessons?.length || 0} lessons)
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-3 pl-11">
                              <div className="space-y-2">
                                {mod.lessons?.map((lesson, l) => (
                                  <div key={l} className="flex items-center gap-3 text-sm text-slate-600">
                                    {lesson.type === 'video' ? (
                                      <PlayCircle className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-orange-500" />
                                    )}
                                    {lesson.title}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </TabsContent>

                  {/* Highlights Tab */}
                  <TabsContent value="highlights" className="mt-0">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {previewProduct.features?.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                      {(!previewProduct.features || previewProduct.features.length === 0) && (
                        <p className="text-slate-400 italic col-span-2 text-center py-8">
                          No highlights added.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Instructor Tab */}
                  <TabsContent value="instructor" className="mt-0">
                    <div className="grid gap-4">
                      {previewProduct.instructors?.length > 0 ? (
                        previewProduct.instructors.map((inst) => (
                          <div key={inst.id} className="flex items-center gap-4 p-4 border rounded-xl bg-slate-50">
                            <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              {inst.profile_image ? (
                                <img src={inst.profile_image} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">
                                  {inst.first_name?.[0] || 'T'}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">
                                {inst.full_name || inst.username}
                              </h4>
                              <p className="text-sm text-slate-500">{inst.email}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic text-center py-8">
                          No instructors assigned.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                </div>
              </Tabs>

              {/* Render Overview HTML if exists */}
              {previewProduct.overview && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                    Detailed Overview
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{ __html: previewProduct.overview }}
                  />
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureRow({ icon: Icon, label }) {
  return <div className="flex gap-3 text-sm text-slate-600"><Icon className="h-4 w-4 text-slate-400" /><span>{label}</span></div>
}