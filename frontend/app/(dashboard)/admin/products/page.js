'use client';

import { useEffect, useState, useMemo } from 'react';
import DataTable from '@/components/DataTable';
import FormBuilder from '@/components/FormBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { productAPI, categoryAPI } from '@/lib/lmsService';
import { authService } from '@/lib/authService';
import {
  Plus, Pencil, Trash2, Upload, Image as ImageIcon, Eye, X,
  GripVertical, Video, FileText, CheckCircle2, PlayCircle,
  BookOpen, Users, ShieldCheck
} from 'lucide-react';
import { z } from 'zod';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

// --- Validation Schema ---
const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  total_seats: z.coerce.number().min(1, 'Total seats must be at least 1'),
  description: z.string().min(1, 'Short description is required'),
  overview: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  instructors: z.array(z.number()).optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  discounted_price: z.coerce.number().min(0).optional().or(z.literal('')),
  duration_days: z.coerce.number().min(0).optional(),
  duration_preset: z.string().optional(),
  is_active: z.boolean().optional(),
});

export default function ProductsPage() {
  // --- State ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Image State
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Complex Data State
  const [featuresList, setFeaturesList] = useState([]);
  const [curriculumData, setCurriculumData] = useState([]);

  // Preview State
  const [previewProduct, setPreviewProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, teachersData] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
        authService.getAllUsers({ role: 'teacher' }),
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setTeachers(Array.isArray(teachersData?.results) ? teachersData.results : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleEdit = async (product) => {
    try {
      setLoading(true);
      const fullProduct = await productAPI.getById(product.id);
      setEditingProduct({
        ...fullProduct,
        category: fullProduct.category?.toString(),
        instructors: fullProduct.instructors?.map(i => i.id) || [],
      });

      // Load complex data
      setExistingImages(fullProduct.images || []);
      setFeaturesList(fullProduct.features || []);
      setCurriculumData(fullProduct.curriculum || []);

      setShowForm(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load details' });
    } finally {
      setLoading(false);
    }
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

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const payload = {
        ...formData,
        total_seats: Number(formData.total_seats),
        price: Number(formData.price),
        discounted_price: formData.discounted_price ? Number(formData.discounted_price) : null,
        duration_days: formData.duration_days ? Number(formData.duration_days) : 0,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        features: featuresList,
        curriculum: curriculumData,
      };
      
      // Remove helper field
      delete payload.duration_preset;

      let productId;
      if (editingProduct) {
        await productAPI.update(editingProduct.id, payload);
        productId = editingProduct.id;
        setMessage({ type: 'success', text: 'Product updated successfully!' });
      } else {
        const newProduct = await productAPI.create(payload);
        productId = newProduct.id;
        setMessage({ type: 'success', text: 'Product created successfully!' });
      }

      if (selectedImages.length > 0) {
        await uploadImages(productId);
      }

      handleCancel();
      fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to save product',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setFeaturesList([]);
    setCurriculumData([]);
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
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

  // --- Complex Builders (Curriculum/Features) ---
  const addFeature = () => setFeaturesList([...featuresList, ""]);
  const updateFeature = (index, val) => { const n = [...featuresList]; n[index] = val; setFeaturesList(n); };
  const removeFeature = (i) => setFeaturesList(featuresList.filter((_, idx) => idx !== i));

  const addModule = () => setCurriculumData([...curriculumData, { title: "New Module", lessons: [] }]);
  const updateModule = (i, f, v) => { const n = [...curriculumData]; n[i][f] = v; setCurriculumData(n); };
  const removeModule = (i) => setCurriculumData(curriculumData.filter((_, idx) => idx !== i));
  const addLesson = (mI) => { const n = [...curriculumData]; n[mI].lessons.push({ title: "Lesson", type: "video" }); setCurriculumData(n); };
  const updateLesson = (mI, lI, f, v) => { const n = [...curriculumData]; n[mI].lessons[lI][f] = v; setCurriculumData(n); };
  const removeLesson = (mI, lI) => { const n = [...curriculumData]; n[mI].lessons = n[mI].lessons.filter((_, idx) => idx !== lI); setCurriculumData(n); };

  // --- Image Helpers ---
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + existingImages.length + selectedImages.length > 5) return alert('Max 5 images');
    setSelectedImages([...selectedImages, ...files]);
    setImagePreviews([...imagePreviews, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
  };
  const removeSelectedImage = (i) => {
    URL.revokeObjectURL(imagePreviews[i].url);
    setSelectedImages(selectedImages.filter((_, idx) => idx !== i));
    setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
  };
  const removeExistingImage = async (id) => {
    if (!confirm('Delete?')) return;
    try { await productAPI.deleteImage(editingProduct.id, id); setExistingImages(existingImages.filter(i => i.id !== id)); } catch (e) { }
  };
  const setPrimaryImage = async (id) => {
    try { await productAPI.setPrimaryImage(editingProduct.id, id); setExistingImages(existingImages.map(i => ({ ...i, is_primary: i.id === id }))); } catch (e) { }
  };
  const uploadImages = async (pid) => {
    setUploadingImages(true);
    try { await productAPI.uploadImages(pid, selectedImages); } catch (e) { } finally { setUploadingImages(false); }
  };

  // --- Configs ---
  const productFields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', required: true, options: categories.map(c => ({ label: c.name, value: c.id?.toString() })) },
    { name: 'instructors', label: 'Instructors', type: 'multiselect', options: teachers.map(t => ({ label: `${t.first_name} ${t.last_name}`, value: t.id })) },
    { name: 'total_seats', label: 'Seats', type: 'number', required: true },
    { name: 'price', label: 'Price', type: 'number', required: true },
    { name: 'discounted_price', label: 'Discount Price', type: 'number' },
    { 
      name: 'duration_preset', 
      label: 'Duration Type', 
      type: 'select', 
      options: [
        { label: 'Lifetime Access', value: '0' },
        { label: 'Weekly (7 Days)', value: '7' },
        { label: 'Fortnightly (15 Days)', value: '15' },
        { label: 'Monthly (30 Days)', value: '30' },
        { label: 'Quarterly (90 Days)', value: '90' },
        { label: 'Yearly (365 Days)', value: '365' },
        { label: 'Custom Days', value: 'custom' },
      ],
      onChange: (val, form) => {
        if (val !== 'custom') {
            form.setValue('duration_days', Number(val));
        }
      } 
    },
    { name: 'duration_days', label: 'Duration (Days)', type: 'number', description: 'Enter 0 for lifetime access.' },
    { name: 'description', label: 'Short Desc', type: 'textarea', required: true },
    { name: 'overview', label: 'Rich Overview', type: 'textarea', rows: 5 },
    { name: 'is_active', label: 'Active', type: 'checkbox' },
  ], [categories, teachers]);

  const columns = [
    {
      accessorKey: 'name', header: 'Product', cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img src={row.original.primary_image || FALLBACK_IMAGE} className="w-10 h-10 rounded object-cover" />
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
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
      </div>

      {message.text && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message.text}</div>}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingProduct ? 'Edit' : 'Create'} Product</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="features">Highlights</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <FormBuilder fields={productFields} validationSchema={productSchema} onSubmit={handleSubmit} isSubmitting={submitting} defaultValues={editingProduct || { is_active: true }} onCancel={handleCancel} />
              </TabsContent>
              <TabsContent value="curriculum" className="space-y-4">
                <Button onClick={addModule} size="sm" variant="outline" className="mb-2"><Plus className="h-4 w-4 mr-2" /> Add Module</Button>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {curriculumData.map((m, mi) => (
                    <AccordionItem key={mi} value={`m-${mi}`} className="border rounded px-2">
                      <div className="flex items-center gap-2 py-2">
                        <Input value={m.title} onChange={(e) => updateModule(mi, 'title', e.target.value)} className="h-8 font-bold" placeholder="Module Name" />
                        <AccordionTrigger />
                        <Button size="icon" variant="ghost" onClick={() => removeModule(mi)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                      <AccordionContent className="space-y-2 pl-4">
                        {m.lessons.map((l, li) => (
                          <div key={li} className="flex gap-2 items-center">
                            <Input value={l.title} onChange={(e) => updateLesson(mi, li, 'title', e.target.value)} className="h-8 text-sm" placeholder="Lesson" />
                            <Button size="icon" variant="ghost" onClick={() => removeLesson(mi, li)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => addLesson(mi)} className="text-blue-600 text-xs">+ Add Lesson</Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="features" className="space-y-2">
                <Button onClick={addFeature} size="sm" variant="outline" className="mb-2"><Plus className="h-4 w-4 mr-2" /> Add Highlight</Button>
                {featuresList.map((f, i) => (
                  <div key={i} className="flex gap-2"><Input value={f} onChange={(e) => updateFeature(i, e.target.value)} /><Button size="icon" variant="ghost" onClick={() => removeFeature(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                ))}
              </TabsContent>
              <TabsContent value="images">
                {/* Existing Image Logic... */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {existingImages.map(img => (
                      <div key={img.id} className="relative group h-24 border rounded overflow-hidden">
                        <img src={img.image_url || img.image} className="w-full h-full object-cover" />
                        {img.is_primary && <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-1">Main</div>}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                          <Button size="icon" className="h-6 w-6" onClick={() => setPrimaryImage(img.id)}><Eye className="h-3 w-3" /></Button>
                          <Button size="icon" className="h-6 w-6 bg-red-600" onClick={() => removeExistingImage(img.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2"><Input type="file" multiple onChange={handleImageSelect} />{selectedImages.length > 0 && <Button onClick={() => uploadImages(editingProduct.id)}>Upload</Button>}</div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

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