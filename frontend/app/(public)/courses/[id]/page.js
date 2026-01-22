'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productAPI } from '@/lib/lmsService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  BookOpen,
  Users,
  CheckCircle2,
  Calendar,
  Star,
  Share2,
  Heart,
  ShieldCheck,
  Globe,
  PlayCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productLeadAPI } from "@/lib/lmsService";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Image States
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productAPI.getById(params.id);
        setProduct(data);
        
        if (data?.name) {
          document.title = `${data.name} | Tutorlix`;
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleNextImage = useCallback((e) => {
    e?.stopPropagation();
    if (!product?.images?.length) return;
    setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
  }, [product]);

  const handlePrevImage = useCallback((e) => {
    e?.stopPropagation();
    if (!product?.images?.length) return;
    setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  }, [product]);

  // Enrollment Dialog State
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '', state: '' });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handleNextImage, handlePrevImage]);

  const handleEnroll = () => {
    if (user) {
        setEnrollForm({
            name: user.full_name || (user.first_name ? `${user.first_name} ${user.last_name}` : ''),
            email: user.email || '',
            phone: user.phone || '', 
            state: user.state || '' // Mapping basic address or state if available
        });
    }
    setEnrollSuccess(false);
    setIsEnrollDialogOpen(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    try {
        setEnrollSubmitting(true);
        await productLeadAPI.create({
            ...enrollForm,
            product: product.id
        });
        setEnrollSuccess(true);
    } catch (error) {
        console.error("Enrollment error", error);
    } finally {
        setEnrollSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Course not found</h2>
        <p className="text-slate-500 mb-6">The course you are looking for might have been removed.</p>
        <Link href="/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const currentImageObj = images[selectedImageIndex];
  const mainImageSrc = currentImageObj?.image_url || currentImageObj?.image || product.primary_image || FALLBACK_IMAGE;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* --- BREADCRUMB --- */}
      <div className="border-b border-slate-100 bg-white sticky top-0 z-30 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/courses" className="hover:text-slate-900 flex items-center gap-1 transition-colors">
               <ArrowLeft className="h-3 w-3" /> Back
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-md">
                {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- LEFT CONTENT --- */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                 <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md px-3 font-medium">
                    {product.category_name || "Development"}
                 </Badge>
                 {/* <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                   <Star className="h-4 w-4 fill-current" />
                   <span>4.8</span>
                   <span className="text-slate-300 mx-1">•</span>
                   <span className="text-slate-500 font-normal">120 reviews</span>
                 </div> */}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                {product.name}
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
                {product.description}
              </p>

              {/* <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 pt-2">
                 <div className="flex items-center gap-2">
                   <Globe className="h-4 w-4" />
                   <span>English</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   <span>Last updated Jan 2026</span>
                 </div>
              </div> */}
            </div>

            {/* Main Image (Smart Fit) */}
            <div 
              className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            >
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110 transition-transform duration-700"
                  style={{ backgroundImage: `url(${mainImageSrc})` }}
                />
                <img
                    src={mainImageSrc}
                    alt={product.name}
                    className="relative w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <div className="bg-black/50 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 duration-300">
                      <Maximize2 className="h-6 w-6" />
                   </div>
                </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {images.map((image, index) => (
                  <button
                    key={image.id || index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      index === selectedImageIndex ? 'border-slate-900 ring-1 ring-slate-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={image.image_url || image.image} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Content Tabs */}
            <div className="pt-8">
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 mb-8 gap-8">
                        {['Overview', 'Curriculum', 'Instructor'].map((tab) => (
                             <TabsTrigger 
                                key={tab}
                                value={tab.toLowerCase()}
                                className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 text-base font-medium transition-colors"
                             >
                                {tab}
                             </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* OVERVIEW */}
                    <TabsContent value="overview" className="animate-in fade-in-50 duration-500">
                         {product.overview ? (
                            <article 
                              className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl"
                              dangerouslySetInnerHTML={{ __html: product.overview }} 
                            />
                         ) : (
                            <div className="space-y-4 text-slate-600 leading-relaxed">
                                <p>{product.description}</p>
                                <p className="italic text-slate-400">No detailed overview provided for this course.</p>
                            </div>
                         )}
                    </TabsContent>

                    {/* CURRICULUM */}
                    <TabsContent value="curriculum" className="space-y-8 animate-in fade-in-50 duration-500">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Course Content</h3>
                            {(!product.curriculum || product.curriculum.length === 0) ? (
                                <div className="p-8 border border-dashed rounded-xl text-center text-slate-500 bg-slate-50">
                                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                    <p>Curriculum details coming soon.</p>
                                </div>
                            ) : (
                                <Accordion type="single" collapsible className="w-full space-y-3">
                                    {product.curriculum.map((module, idx) => (
                                        <AccordionItem key={idx} value={`module-${idx}`} className="border rounded-xl px-4 bg-white hover:bg-slate-50/50 transition-colors">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{module.title}</div>
                                                        {/* Hide count if 0 */}
                                                        {module.lessons?.length > 0 && (
                                                          <div className="text-xs text-slate-500 font-normal mt-0.5">
                                                              {module.lessons.length} Lessons
                                                          </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-0 pl-[3.25rem]">
                                                <div className="space-y-3 border-l-2 border-slate-100 pl-4 mt-2">
                                                    {module.lessons?.map((lesson, lIdx) => (
                                                        <div key={lIdx} className="flex items-center gap-3 text-sm text-slate-600">
                                                            {/* Icons removed as requested */}
                                                            <span>{lesson.title}</span>
                                                        </div>
                                                    ))}
                                                    {(!module.lessons || module.lessons.length === 0) && (
                                                        <span className="text-xs text-slate-400 italic">No lessons listed yet.</span>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </div>
                    </TabsContent>

                    {/* INSTRUCTOR */}
                    <TabsContent value="instructor" className="animate-in fade-in-50 duration-500">
                        <div className="space-y-4">
                            {product.instructors && product.instructors.length > 0 ? (
                                product.instructors.map((inst) => (
                                    <div key={inst.id} className="flex items-start gap-5 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                         <div className="h-16 w-16 rounded-full bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                            {inst.profile_image ? (
                                                <img src={inst.profile_image} alt={inst.full_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-xl font-bold text-slate-400">{inst.first_name?.[0] || "T"}</span>
                                            )}
                                         </div>
                                         <div>
                                            <h4 className="text-lg font-bold text-slate-900">{inst.full_name || inst.username}</h4>
                                            <p className="text-sm text-slate-500 mb-2">{inst.email}</p>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                {inst.bio || "Passionate educator with years of industry experience. Dedicated to helping students achieve their goals through practical learning."}
                                            </p>
                                         </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 italic p-4">No instructor information available.</div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
          </div>

          {/* --- RIGHT SIDEBAR --- */}
          <div className="lg:col-span-4 relative">
             <div className="sticky top-24 space-y-6">
                
                {/* Price Card */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                   <div className="mb-6">
                      <p className="text-sm text-slate-500 font-medium mb-1">
                         Course Access for {product.duration_days > 0 ? <span className="text-slate-900 font-bold">{product.duration_days} Days</span> : <span className="text-slate-900 font-bold">Lifetime Access</span>}
                      </p>
                      <div className="flex items-end gap-3">
                         <span className="text-4xl font-extrabold text-slate-900">
                           ₹{product.effective_price?.toLocaleString()}
                         </span>
                         {product.discounted_price && (
                             <span className="text-lg text-slate-400 line-through mb-1">
                               ₹{product.price?.toLocaleString()}
                             </span>
                         )}
                      </div>
                      {product.discount_percentage > 0 && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              {product.discount_percentage}% Discount Applied
                          </div>
                      )}
                   </div>

                   <Button onClick={handleEnroll} size="lg" className="w-full text-base font-bold bg-slate-900 hover:bg-slate-800 h-12 rounded-xl mb-3">
                      Enroll Now
                   </Button>
{/*                    
                   <p className="text-xs text-center text-slate-400 mb-6">
                      30-Day Money-Back Guarantee
                   </p> */}

                   {/* Features */}
                   <div className="space-y-4 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">This course includes:</h4>
                      
                      {product.features && product.features.length > 0 ? (
                          product.features.map((feature, index) => (
                              <div key={index} className="flex items-start gap-3 text-sm text-slate-600">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{feature}</span>
                              </div>
                          ))
                      ) : (
                          <>
                              <FeatureRow icon={PlayCircle} label="Self-Paced Learning" />
                              <FeatureRow icon={BookOpen} label={product.duration_days > 0 ? `${product.duration_days} Days Access` : "Full Lifetime Access"} />
                              <FeatureRow icon={Users} label={`${product.total_seats} Enrolled Students`} />
                              <FeatureRow icon={ShieldCheck} label="Certificate of Completion" />
                          </>
                      )}
                   </div>
                </div>

                {/* <div className="flex gap-4">
                   <Button variant="outline" className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 h-11">
                      <Heart className="h-4 w-4 mr-2" /> Wishlist
                   </Button>
                   <Button variant="outline" className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 h-11">
                      <Share2 className="h-4 w-4 mr-2" /> Share
                   </Button>
                </div> */}

             </div>
          </div>

        </div>
      </div>

      {/* --- FULL SCREEN LIGHTBOX --- */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center">
           <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-50">
              <X className="h-8 w-8" />
           </button>

           <div className="relative w-full h-full flex items-center justify-center p-4">
              <img 
                 src={mainImageSrc} 
                 className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
                 alt="Full screen preview"
              />
           </div>

           {images.length > 1 && (
             <>
                <button onClick={handlePrevImage} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 p-3 rounded-full transition-colors">
                   <ChevronLeft className="h-8 w-8" />
                </button>
                <button onClick={handleNextImage} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 p-3 rounded-full transition-colors">
                   <ChevronRight className="h-8 w-8" />
                </button>
             </>
           )}
        </div>
      )}

      {/* --- ENROLLMENT DIALOG --- */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{enrollSuccess ? "Thank You!" : "Enroll Now"}</DialogTitle>
            <DialogDescription>
              {enrollSuccess 
                ? "Your interest has been recorded. Our team will contact you shortly." 
                : "Please share your details to proceed with enrollment."}
            </DialogDescription>
          </DialogHeader>

          {enrollSuccess ? (
             <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                   <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <Button onClick={() => setIsEnrollDialogOpen(false)} className="w-full">
                   Close
                </Button>
             </div>
          ) : (
            <form onSubmit={handleEnrollSubmit} className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="lead-name">Name</Label>
                    <Input 
                        id="lead-name" 
                        required 
                        value={enrollForm.name}
                        onChange={(e) => setEnrollForm({...enrollForm, name: e.target.value})}
                        placeholder="John Doe"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lead-email">Email</Label>
                    <Input 
                        id="lead-email" 
                        type="email" 
                        required 
                        value={enrollForm.email}
                        onChange={(e) => setEnrollForm({...enrollForm, email: e.target.value})}
                        placeholder="john@example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lead-phone">Phone Number</Label>
                    <Input 
                        id="lead-phone" 
                        type="tel" 
                        required 
                        value={enrollForm.phone}
                        onChange={(e) => setEnrollForm({...enrollForm, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lead-state">State</Label>
                    <Input 
                        id="lead-state" 
                        required 
                        value={enrollForm.state}
                        onChange={(e) => setEnrollForm({...enrollForm, state: e.target.value})}
                        placeholder="State/Province"
                    />
                </div>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={enrollSubmitting}>
                        {enrollSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit Request
                    </Button>
                </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function FeatureRow({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-3 text-sm text-slate-600">
            <Icon className="h-4 w-4 text-slate-400" />
            <span>{label}</span>
        </div>
    )
}