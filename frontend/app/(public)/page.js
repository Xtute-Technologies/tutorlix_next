'use client';

import { useEffect, useState } from 'react';
import { categoryAPI, productAPI } from '@/lib/lmsService';
import { Loader2 } from 'lucide-react';
import { useProfile } from "@/context/ProfileContext";

// Import Refactored Components
import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import HomeBenefits from '@/components/home/HomeBenefits';
import HomeAbout from '@/components/home/HomeAbout';
import HomeTestimonials from '@/components/home/HomeTestimonials';

export default function HomePage() {
  const { profileType } = useProfile();
  
  // --- Data States ---
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Loaders
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  // 1. Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (categories.length === 0) setInitialLoading(true);
        const data = await categoryAPI.getAll({ profile_type: profileType });
        setCategories(Array.isArray(data) ? data : []);
        setActiveCategory("all");
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategories();
  }, [profileType]);

  // 2. Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        
        const params = {
          page_size: 10,
          type: profileType 
        };

        if (activeCategory !== 'all') {
          params.category = activeCategory;
        }

        const data = await productAPI.getAll(params);
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
  }, [activeCategory, profileType]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans overflow-hidden">
      
      <HomeHero />
      
      <HomeCourses 
        products={products}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        loading={productsLoading}
      />

      <HomeBenefits />

      <HomeAbout />

      <HomeTestimonials />

    </div>
  );
}