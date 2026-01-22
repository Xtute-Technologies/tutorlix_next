'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { productAPI, categoryAPI } from '@/lib/lmsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, SlidersHorizontal, X } from 'lucide-react';
import { cn } from "@/lib/utils"; // Assuming you have a cn utility, if not use standard template literals

export default function CoursesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- State ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  // We use a separate state for the actual API call to debounce typing
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('ordering') || '');

  // --- 1. Initial Data Load (Categories) ---
  useEffect(() => {
    fetchCategories();
  }, []);

  // --- 2. Debounce Search Logic ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // --- 3. Fetch Products when Filters Change ---
  useEffect(() => {
    fetchProducts();
    updateUrl();
  }, [debouncedSearch, selectedCategory, sortBy]);

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy) params.set('ordering', sortBy);
    
    // Update URL without reloading the page (Shallow routing)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Prepare Query Params for Django
      const params = {};
      
      if (debouncedSearch) {
        params.search = debouncedSearch; // Django standard SearchFilter
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory; // Assuming your Django FilterSet uses 'category'
      }

      if (sortBy) {
        params.ordering = sortBy; // Django standard OrderingFilter
      }

      // Pass params to your service
      const data = await productAPI.getAll(params);
      
      // Handle pagination result (results array) or direct array
      const results = data.results || data; 
      setProducts(Array.isArray(results) ? results.filter(p => p.is_active) : []);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId.toString());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSortBy('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Explore Courses</h1>
          <p className="text-gray-600">Find the perfect course to upgrade your skills.</p>
        </div>
        
        {/* Sort Dropdown (kept simple on the right) */}
        <div className="w-full md:w-48">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              {/* Django usually uses minus sign for descending */}
              <SelectItem value="effective_price">Price (Low to High)</SelectItem> 
              <SelectItem value="-effective_price">Price (High to Low)</SelectItem>
              <SelectItem value="-created_at">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- Search & Category Area --- */}
      <div className="space-y-6 mb-10">
        
        {/* 1. Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search for courses, topics, or instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg shadow-sm"
          />
          {searchQuery && (
             <button 
               onClick={() => setSearchQuery('')}
               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               <X className="h-4 w-4" />
             </button>
          )}
        </div>

        {/* 2. Category Tabs (Scrollable) */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mask-gradient">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => handleCategoryClick('all')}
              className="rounded-full px-6 whitespace-nowrap transition-all"
            >
              All Courses
            </Button>
            
            {categoriesLoading ? (
               // Skeleton loaders for categories
               [...Array(5)].map((_, i) => (
                 <div key={i} className="h-10 w-24 bg-gray-100 rounded-full animate-pulse" />
               ))
            ) : (
              categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id.toString() ? 'default' : 'outline'}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    "rounded-full px-6 whitespace-nowrap transition-all",
                    selectedCategory === category.id.toString() ? "shadow-md" : "hover:bg-gray-100 border-gray-200"
                  )}
                >
                  {category.name}
                </Button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- Results Section --- */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Course Skeleton Loaders */}
           {[...Array(6)].map((_, i) => (
             <Card key={i} className="h-full overflow-hidden">
               <div className="h-48 bg-gray-200 animate-pulse" />
               <CardHeader className="space-y-2">
                 <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                 <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
               </CardHeader>
               <CardContent>
                 <div className="h-10 bg-gray-200 rounded animate-pulse" />
               </CardContent>
             </Card>
           ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/courses/${product.id}`} className="group">
              <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/60">
                {/* Course Image */}
                <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-gray-100">
                  {product.primary_image ? (
                    <img
                      src={product.primary_image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <BookOpen className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {product.discounted_price && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm">
                        {product.discount_percentage || Math.round(((product.price - product.effective_price)/product.price)*100)}% OFF
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                     <Badge variant="outline" className="mb-2 text-xs font-normal text-gray-500 border-gray-200">
                        {product.category_name}
                     </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-medium">Price</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          ₹{product.effective_price}
                        </span>
                        {product.discounted_price && (
                          <span className="text-sm text-gray-400 line-through decoration-gray-400">
                            ₹{product.price}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button size="sm" variant="secondary" className="group-hover:bg-primary group-hover:text-white transition-colors">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses found</h3>
          <p className="text-gray-500 max-w-md mb-6">
            We couldn&apos;t find any courses matching "{debouncedSearch}" {selectedCategory !== 'all' ? `in this category` : ''}.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}