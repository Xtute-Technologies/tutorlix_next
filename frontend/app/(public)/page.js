'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { categoryAPI, productAPI } from '@/lib/lmsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ArrowRight, Loader2, BookOpen, Rocket, Code2, Users, Briefcase, Star, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import DotGrid from '@/components/DotGrid';


// Fallback image constant
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

// Data for the animated benefits section
const benefitsData = [
  { icon: Rocket, title: "Project-Based Learning", description: "Stop watching videos. Start building real-world applications that get you hired." },
  { icon: Users, title: "1:1 Mentorship", description: "Get unstuck faster with direct access to senior engineers from top tech companies." },
  { icon: Code2, title: "Career Framework", description: "Structured paths focused on the exact skills required for SDE-1 and SDE-2 roles." }
];

const companiesList = ["Google", "Microsoft", "Amazon", "Netflix", "Meta", "Uber", "Salesforce", "Adobe"];

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

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

            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-green-400 font-medium tracking-wide uppercase text-sm">Restricted by opportunities?</p>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-white">
                  Get the tech career <br />
                  you deserve. <span className="text-slate-400">Faster.</span>
                </h1>
              </div>
              <div className="space-y-6 pt-4">
                <HeroFeatureItem text="128% average hike via our placement cell" />
                <HeroFeatureItem text="1.5 Lac+ learners cracked top tech companies" />
                <HeroFeatureItem text="Practical skills over theoretical knowledge" />
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:ml-auto relative z-10">
              <Card className="border-0 shadow-2xl shadow-slate-900/50 bg-white text-slate-900 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">Start your journey today</CardTitle>
                  <p className="text-sm text-slate-500">Select your goal to get personalized guidance</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Current Status</Label>
                    <RadioGroup defaultValue="student" className="grid grid-cols-2 gap-2">
                      <div>
                        <RadioGroupItem value="student" id="r2" className="peer sr-only" />
                        <Label htmlFor="r2" className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-sm font-medium transition-all">
                          Student
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="professional" id="r1" className="peer sr-only" />
                        <Label htmlFor="r1" className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-sm font-medium transition-all">
                          Professional
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Select>
                      <SelectTrigger className="h-11 rounded-lg">
                        <SelectValue placeholder="Select interest area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Full Stack Development</SelectItem>
                        <SelectItem value="data">Data Science & AI</SelectItem>
                        <SelectItem value="dsa">Backend & System Design</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <Input placeholder="Full Name" className="h-11 rounded-lg" />
                    <Input placeholder="Phone Number (+91)" className="h-11 rounded-lg" />
                  </div>
                  <Button className="w-full text-md font-bold h-12 mt-2 bg-primary hover:bg-primary/90 rounded-lg" size="lg">
                    Get Free Counselling
                  </Button>
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
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why learners choose us</h2>
            <p className="text-lg text-slate-600">We don't just teach you to code; we teach you how to think like an engineer.</p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
          >
            {benefitsData.map((benefit, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
                }}
                className="relative group p-6"
              >
                {/* Animated Line */}
                <div className="absolute top-0 left-6 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700 ease-in-out opacity-20 group-hover:opacity-100"></div>

                <div className="relative pl-6">
                  <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 text-slate-900 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- MINIMAL SOCIAL PROOF --- */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-10">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 grayscale opacity-60 hover:opacity-100 transition-all duration-500">
            {companiesList.map((company, index) => (
              <span key={index} className="text-xl font-bold text-slate-900 select-none cursor-default">
                {company}
              </span>
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