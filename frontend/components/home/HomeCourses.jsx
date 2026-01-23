'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen } from 'lucide-react';
import { cn } from "@/lib/utils";
import { FALLBACK_IMAGE } from "@/app/data/homeContent";

export default function HomeCourses({ 
  products, 
  categories, 
  activeCategory, 
  setActiveCategory, 
  loading 
}) {
  return (
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
        {loading ? (
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
  );
}