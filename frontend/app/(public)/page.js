'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { categoryAPI, productAPI, productLeadAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, ArrowRight, Loader2, BookOpen,
  Star, Quote, Target, Check, Sparkles, BrainCircuit
} from 'lucide-react';
import { motion } from 'framer-motion';
import DotGrid from '@/components/DotGrid';
import { useProfile } from "@/context/ProfileContext";
import { z } from 'zod';
import FormBuilder from '@/components/FormBuilder';
import { cn } from "@/lib/utils";

import {
  profileContent,
  benefitsData,
  testimonialsData,
  FALLBACK_IMAGE,
} from "@/app/data/homeContent";

const INTEREST_OPTIONS = [
  { id: 'web', label: 'Full Stack Dev' },
  { id: 'data', label: 'Data Science & AI' },
  { id: 'dsa', label: 'Backend & System' }
];

// --- Zod Validation Schema ---
const leadSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  state: z.string().min(1, "State is required"),
});

export default function HomePage() {
  const { profileType } = useProfile();
  
  // --- Data States ---
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Loaders
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // --- Lead Form States ---
  const [selectedInterest, setSelectedInterest] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // 1. Fetch Categories on Mount or Profile Change
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // We set initial loading only for the first load of categories
        if (categories.length === 0) setInitialLoading(true);
        
        const data = await categoryAPI.getAll({ profile_type: profileType });
        setCategories(Array.isArray(data) ? data : []);
        
        // Reset category to 'all' if profile changes
        setActiveCategory("all");
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategories();
  }, [profileType]);

  // 2. Fetch Products whenever Active Category Changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        
        const params = {
          page_size: 10,
          // Optional: passing profile type if backend needs it to filter products contextually
          // type: profileType 
        };

        if (activeCategory !== 'all') {
          params.category = activeCategory;
        }

        // Call the standard getAll endpoint (like /api/lms/products/?category=1&page_size=10)
        const data = await productAPI.getAll(params);
        
        // Handle pagination response vs direct array
        const results = data.results || data;
        setProducts(Array.isArray(results) ? results : []);
        
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeCategory, profileType]); // Re-fetch if category or profile changes

  const activeProfile = profileContent[profileType] || profileContent.college;
  const activeBenefits = benefitsData[profileType] || benefitsData.college;

  // --- Form Config ---
  const leadFields = useMemo(() => [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
    { 
      name: 'phone', 
      label: 'Phone Number', 
      type: 'phone', 
      placeholder: '98765 43210', 
      required: true,
    },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', required: true },
    { 
      name: 'state', 
      label: 'State', 
      type: 'state_names', 
      placeholder: 'Select your state', 
      required: true 
    },
  ], []);

  const handleLeadSubmit = async (formData) => {
    if (!selectedInterest) {
      alert("Please select an area of interest.");
      return;
    }

    try {
      setSubmittingLead(true);
      await productLeadAPI.create({
        name: formData.name,
        email: formData.email,
        phone: `+91${formData.phone}`,
        state: formData.state,
        source: 'Home Page',
        remarks: `Profile: ${activeProfile.formRole} | Interest: ${selectedInterest}`
      });
      setLeadSuccess(true);
      setSelectedInterest('');
    } catch (error) {
      console.error("Lead submission error", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmittingLead(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans overflow-hidden">

      {/* --- HERO SECTION --- */}
      <section className="relative bg-black text-white pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 h-full w-full">
           <div style={{ width: '100%', height: '100%', position: 'relative' }}>
             <DotGrid
               dotSize={5}
               gap={15}
               baseColor="#271E37"
               activeColor="#5227FF"
               proximity={120}
               speedTrigger={100}
               shockRadius={250}
               shockStrength={5}
               maxSpeed={5000}
               resistance={750}
               returnDuration={1.5}
             />
           </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-green-400 font-medium tracking-wide uppercase text-sm">
                  {activeProfile.tag}
                </p>

                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                  {activeProfile.headline}
                </h1>
              </div>
              <div className="space-y-6 pt-4">
                {activeProfile.bullets.map((text, i) => (
                  <HeroFeatureItem key={i} text={text} />
                ))}
              </div>
            </div>

            {/* Right Form Card */}
            <div className="w-full max-w-md mx-auto lg:ml-auto relative z-10">
              <Card className="border-0 shadow-2xl shadow-slate-900/50 bg-white text-slate-900 rounded-2xl overflow-hidden">
                <CardHeader className="border-slate-100 bg-slate-50/50 mb-0">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Start your journey 
                  </CardTitle>
                  <p className="text-xs text-slate-500">Get a personalized learning roadmap</p>
                </CardHeader>
                
                <CardContent className="space-y-5 p-5 pt-0 mt-0">
                  {leadSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                      <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                        <Check className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Request Received!</h3>
                      <p className="text-slate-600 text-sm">
                        Thanks for your interest. Our team will contact you shortly to guide you forward.
                      </p>
                      <Button variant="outline" onClick={() => setLeadSuccess(false)} className="mt-4">
                        Send another request
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Interest Selection */}
                      <div className="space-y-2 mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">I am interested in</label>
                        <div className="flex flex-wrap gap-2">
                          {INTEREST_OPTIONS.map((opt) => (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => setSelectedInterest(opt.label)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                                selectedInterest === opt.label 
                                  ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <FormBuilder
                        fields={leadFields}
                        validationSchema={leadSchema}
                        onSubmit={handleLeadSubmit}
                        submitLabel={activeProfile.cta}
                        isSubmitting={submittingLead}
                        className="grid grid-cols-1 gap-y-2"
                        submitButton={{ text: activeProfile.cta, loadingText: "Submitting..." }}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* --- COURSES SECTION --- */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-10 text-center md:text-left md:flex md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Explore Courses</h2>
              <p className="text-slate-500 mt-2 text-lg">Curated paths for every stage of your career</p>
            </div>
            <Link href="/courses" className="hidden md:block">
              <Button variant="ghost" className="text-slate-600 hover:text-primary hover:bg-transparent p-0 flex items-center gap-2 group">
                View All Programs <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Categories (Scrollable Pills) */}
          <div className="relative mb-10">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mask-gradient">
              <Button
                variant={activeCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('all')}
                className="rounded-full px-6 whitespace-nowrap transition-all"
              >
                All Courses
              </Button>
              
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id.toString() ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(category.id.toString())}
                  className={cn(
                    "rounded-full px-6 whitespace-nowrap transition-all",
                    activeCategory === category.id.toString() ? "shadow-md" : "hover:bg-gray-100 border-gray-200"
                  )}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid (With Loader) */}
          {productsLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-full overflow-hidden border-gray-100">
                    <div className="h-48 bg-gray-100 animate-pulse" />
                    <CardHeader className="space-y-2">
                      <div className="h-6 bg-gray-100 rounded w-3/4 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-100 rounded w-full animate-pulse mb-2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
             </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/courses/${product.id}`} className="group h-full block">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/60 overflow-hidden flex flex-col">
                    
                    {/* Course Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                      <img
                        src={product.primary_image || FALLBACK_IMAGE}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      
                      {/* Discount Badge */}
                      {product.discounted_price && (
                         <div className="absolute top-3 right-3">
                           <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm">
                             {product.discount_percentage || Math.round(((product.price - product.effective_price)/product.price)*100)}% OFF
                           </Badge>
                         </div>
                       )}
                    </div>

                    <CardHeader className="pb-3 flex-none">
                      <div className="flex justify-between items-start gap-2">
                         <Badge variant="outline" className="mb-2 text-xs font-normal text-gray-500 border-gray-200">
                            {product.category_name}
                         </Badge>
                         {/* Optional Rating */}
                      
                      </div>
                      <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                        {product.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col flex-grow">
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 w-full">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 font-medium">Price</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-900">
                              ₹{product.effective_price?.toLocaleString()}
                            </span>
                            {product.price > product.effective_price && (
                              <span className="text-sm text-gray-400 line-through decoration-gray-400">
                                ₹{product.price?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="bg-slate-50 p-4 rounded-full mb-3">
                 <BookOpen className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-600">No courses found.</p>
              <Button variant="link" onClick={() => setActiveCategory("all")} className="text-primary mt-1">
                View all courses
              </Button>
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link href="/courses">
              <Button variant="outline" size="lg" className="w-full rounded-xl">
                Browse All Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- ANIMATED "WHY US" SECTION --- */}
      <section className="py-24 bg-white overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {activeBenefits.title}
            </h2>
            <p className="text-lg text-slate-600">
              {activeBenefits.subtitle}
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
          >
            {activeBenefits.items.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, ease: "easeOut" },
                    },
                  }}
                  className="relative group p-6"
                >
                  <div className="absolute top-0 left-6 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700 ease-in-out opacity-20 group-hover:opacity-100" />
                  <div className="relative pl-6">
                    <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* --- ABOUT US SECTION --- */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <Badge variant="outline" className="mb-4 bg-white text-slate-900 border-slate-300">About Tutorlix</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  Interactive learning that <br /> actually works.
                </h2>
                <div className="prose prose-slate text-slate-600">
                  <p className="text-lg mb-4">
                    Take your math and computer science skills to the next level with Tutorlix. Say goodbye to boring lectures and hello to hands-on lessons and exciting projects.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <Target className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-slate-900 mb-2">Fortnightly Testing</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Track progress with challenging tests designed to apply your problem-solving skills.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <BrainCircuit className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-bold text-slate-900 mb-2">High-Quality Content</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Well-recorded lectures and dynamic resources ensure an informative experience.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-900 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 opacity-80" />
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
                  alt="Students learning"
                  className="w-full h-full object-cover mix-blend-overlay opacity-60"
                />
                <div className="absolute bottom-8 left-8 right-8 text-white">
                  <p className="font-bold text-2xl mb-2">"Education is not the filling of a pail, but the lighting of a fire."</p>
                  <p className="text-purple-200">— W.B. Yeats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Student Success Stories</h2>
            <p className="text-slate-500 mt-2">Don't just take our word for it. Hear from our community.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialsData.map((t, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow relative">
                <Quote className="absolute top-8 left-8 h-8 w-8 text-purple-100 fill-purple-100 -z-0" />
                <div className="relative z-10 pt-4">
                  <p className="text-slate-600 italic mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-900">{t.name}</h4>
                    <p className="text-xs text-primary font-medium mt-1 uppercase tracking-wide truncate">{t.course}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

function HeroFeatureItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-1" />
      <p className="text-lg text-slate-200 font-medium leading-snug">{text}</p>
    </div>
  );
}