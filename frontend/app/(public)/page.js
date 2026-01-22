'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { categoryAPI, productAPI, productLeadAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, ArrowRight, Loader2, BookOpen,
  Star, ArrowUpRight, Quote, BrainCircuit, Target, Check, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import DotGrid from '@/components/DotGrid';
import { useProfile } from "@/context/ProfileContext";
import { z } from 'zod';
import FormBuilder from '@/components/FormBuilder'; // Import FormBuilder

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
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  
  // Lead State
  const [selectedInterest, setSelectedInterest] = useState(''); // Managed outside FormBuilder for Chip UI
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  
  const { profileType } = useProfile();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesData, featuredData] = await Promise.all([
        categoryAPI.getAll(),
        productAPI.getFeatured(),
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setFeaturedProducts(Array.isArray(featuredData) ? featuredData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = activeCategory === "all"
    ? featuredProducts
    : featuredProducts.filter(p => p.category_id === activeCategory);

  const activeProfile = profileContent[profileType] || profileContent.college;
  const activeBenefits = benefitsData[profileType] || benefitsData.college;

  // --- Form Configuration ---
  const leadFields = useMemo(() => [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
    { 
      name: 'phone', 
      label: 'Phone Number', 
      type: 'phone', // Uses our new +91 mask
      placeholder: '98765 43210', 
      required: true,
    },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com', required: true },
    { 
      name: 'state', 
      label: 'State', 
      type: 'state_names', // Uses our new Autocomplete
      placeholder: 'Select your state', 
      required: true 
    },
  ], []);

  const handleLeadSubmit = async (formData) => {
    // 1. Validate Interest (Since it's outside FormBuilder)
    if (!selectedInterest) {
      alert("Please select an area of interest.");
      return;
    }

    try {
      setSubmittingLead(true);
      
      // 2. Submit API
      await productLeadAPI.create({
        name: formData.name,
        email: formData.email,
        phone: `+91${formData.phone}`, // Append prefix for backend
        state: formData.state,
        source: 'Home Page',
        remarks: `Profile: ${activeProfile.formRole} | Interest: ${selectedInterest}`
      });

      setLeadSuccess(true);
      // Reset is handled by FormBuilder internally mostly, but we can reset outer state
      setSelectedInterest('');
    } catch (error) {
      console.error("Lead submission error", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmittingLead(false);
    }
  };

  if (loading) {
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
                      {/* 1. Interest Selection (Custom UI outside FormBuilder) */}
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

                      {/* 2. FormBuilder for Compulsory Fields */}
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

          <div className="mb-12 text-center md:text-left md:flex md:items-end md:justify-between">
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

          <div className="mb-10 overflow-x-auto pb-4 no-scrollbar">
            <div className="flex space-x-3">
              <CategoryPill
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
                label="All Programs"
              />
              {categories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  label={cat.name}
                />
              ))}
            </div>
          </div>

          {/* --- MINIMAL MODERN COURSE CARD GRID --- */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/courses/${product.id}`} className="group block h-full">
                  <div className="relative h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">

                    {/* Image Container with Glass Badge */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={product.primary_image || FALLBACK_IMAGE}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      {product.discount_percentage > 0 && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-slate-900 shadow-sm">
                          -{product.discount_percentage}%
                        </div>
                      )}
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex flex-col flex-grow">
                      {/* Meta Tags (Rating/Level) */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] uppercase tracking-wider font-semibold border-0 px-2">
                          Course
                        </Badge>
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>4.8</span>
                          <span className="text-slate-300">•</span>
                          <span>(1.2k)</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors mb-2">
                        {product.name}
                      </h3>

                      {/* Clean Price Footer */}
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-900">
                              ₹{product.effective_price?.toLocaleString()}
                            </span>
                            {product.price > product.effective_price && (
                              <span className="text-xs text-slate-400 line-through decoration-slate-300">
                                ₹{product.price?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover Interaction Button */}
                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <ArrowUpRight className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <BookOpen className="h-10 w-10 mb-3 text-slate-300" />
              <p className="font-medium">No courses found here.</p>
              <Button variant="link" onClick={() => setActiveCategory("all")} className="text-primary">
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

          {/* HEADER */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {activeBenefits.title}
            </h2>
            <p className="text-lg text-slate-600">
              {activeBenefits.subtitle}
            </p>
          </div>

          {/* BENEFITS */}
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
                  {/* Animated Line */}
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

            {/* Text Content */}
            <div className="space-y-8">
              <div>
                <Badge variant="outline" className="mb-4 bg-white text-slate-900 border-slate-300">About Tutorlix</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  Interactive learning that <br /> actually works.
                </h2>
                <div className="prose prose-slate text-slate-600">
                  <p className="text-lg mb-4">
                    Take your math and computer science skills to the next level with Tutorlix. Say goodbye to boring lectures and hello to hands-on lessons and exciting projects. We connect you with a community of ambitious students to unlock your full potential.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <Target className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-slate-900 mb-2">Fortnightly Testing</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Track progress with challenging tests designed to apply your problem-solving skills, followed by expert teacher feedback.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                  <BrainCircuit className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-bold text-slate-900 mb-2">High-Quality Content</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Well-recorded lectures and dynamic resources ensure an informative and accessible learning experience for everyone.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual/Image Side */}
            <div className="relative">
              <div className="aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-900 relative">
                {/* Abstract visual representation */}
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
              {/* Decorative dots */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[radial-gradient(circle,theme(colors.slate.300)_1px,transparent_1px)] bg-[size:8px_8px] opacity-60 -z-10" />
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

// Helper Components
function HeroFeatureItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-1" />
      <p className="text-lg text-slate-200 font-medium leading-snug">{text}</p>
    </div>
  );
}

function CategoryPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      {label}
    </button>
  )
}