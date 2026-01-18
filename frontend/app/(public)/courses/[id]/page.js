'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { productAPI } from '@/lib/lmsService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2
} from 'lucide-react';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productAPI.getById(params.id);
        setProduct(data);
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

  const handleEnroll = () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${params.id}`);
      return;
    }
    alert('Enrollment functionality coming soon!');
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
  const currentImage = images[selectedImageIndex] || null;
  const mainImageSrc = currentImage?.image_url || currentImage?.image || product.primary_image || FALLBACK_IMAGE;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* --- MINIMAL BREADCRUMB --- */}
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
          
          {/* --- LEFT: MAIN CONTENT (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Header Section */}
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
                {product.description || "Master the skills required to excel in this field with our comprehensive curriculum designed by industry experts."}
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

            {/* Main Media / Image */}
            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video relative group">
                <img
                    src={mainImageSrc}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                {/* Optional: Play Button Overlay if it was a video preview */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[2px]">
                   {/* <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" /> */}
                </div>
            </div>

            {/* Thumbnail Strip (if multiple) */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {images.map((image, index) => (
                  <button
                    key={image.id || index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      index === selectedImageIndex ? 'border-slate-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image.image_url || image.image}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Tabs for Details */}
            <div className="pt-8">
                <Tabs defaultValue="curriculum" className="w-full">
                    <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 mb-8 gap-8">
                        {['Curriculum', 'Overview', 'Instructor'].map((tab) => (
                             <TabsTrigger 
                                key={tab}
                                value={tab.toLowerCase()}
                                className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 text-base font-medium transition-colors"
                             >
                                {tab}
                             </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="curriculum" className="space-y-8 animate-in fade-in-50 duration-500">
                        <div>
                            <h3 className="text-xl font-bold mb-6">What you'll learn</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {[
                                    'Master core concepts and fundamentals',
                                    'Build 3+ real-world industry projects',
                                    'Understand best practices & design patterns',
                                    'Get lifetime access to course materials',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 text-slate-600">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        <span className="leading-snug">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold mb-4">Course Content</h3>
                            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                                {['Introduction & Setup', 'Core Fundamentals', 'Advanced Concepts', 'Final Project'].map((module, i) => (
                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {i + 1}
                                            </div>
                                            <span className="font-medium text-slate-800">{module}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">
                                            3 Lessons
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-6 text-slate-600 leading-relaxed animate-in fade-in-50 duration-500">
                         <p>{product.description}</p>
                         <p>
                            This course provides a deep dive into the subject matter, ensuring you not only understand the "how" but also the "why". 
                            Suitable for beginners and intermediate learners alike.
                         </p>
                    </TabsContent>

                    <TabsContent value="instructor" className="animate-in fade-in-50 duration-500">
                        <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-500">
                                T
                             </div>
                             <div>
                                <h4 className="text-lg font-bold text-slate-900">Lead Instructor</h4>
                                <p className="text-sm text-slate-500">Senior Engineer @ TechGiant</p>
                                <p className="text-sm text-slate-600 mt-2">
                                    Passionate about teaching and helping students break into the tech industry.
                                </p>
                             </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
          </div>

          {/* --- RIGHT: STICKY SIDEBAR (4 Cols) --- */}
          <div className="lg:col-span-4 relative">
             <div className="sticky top-24 space-y-6">
                
                {/* Price Card */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                   <div className="mb-6">
                      <p className="text-sm text-slate-500 font-medium mb-1">Total Price</p>
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
                   
                   <p className="text-xs text-center text-slate-400 mb-6">
                      30-Day Money-Back Guarantee
                   </p>

                   <div className="space-y-4 pt-6 border-t border-slate-100">
                      <FeatureRow icon={PlayCircle} label="Self-Paced Learning" />
                      <FeatureRow icon={BookOpen} label="Full Lifetime Access" />
                      <FeatureRow icon={Users} label={`${product.total_seats} Enrolled Students`} />
                      <FeatureRow icon={ShieldCheck} label="Certificate of Completion" />
                   </div>
                </div>

                {/* Wishlist / Share Actions */}
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
    </div>
  );
}

// Minimal Helper for Sidebar Features
function FeatureRow({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-3 text-sm text-slate-600">
            <Icon className="h-4 w-4 text-slate-400" />
            <span>{label}</span>
        </div>
    )
}