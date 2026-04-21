'use client';

import { useEffect, useState } from 'react';
import { categoryAPI, productAPI } from '@/lib/lmsService';
import { publicNoteAPI } from '@/lib/notesService';
import { Loader2 } from 'lucide-react';
import { useProfile } from "@/context/ProfileContext";

// Import Refactored Components
import HomeHero from '@/components/home/HomeHero';
import HomeLearningHub from '@/components/home/HomeLearningHub';
import HomeCourses from '@/components/home/HomeCourses';
import HomeNotes from '@/components/home/HomeNotes';
import HomeBenefits from '@/components/home/HomeBenefits';
import HomeAbout from '@/components/home/HomeAbout';
import HomeTestimonials from '@/components/home/HomeTestimonials';

export default function HomePage() {
  const { profileType } = useProfile();
  
  // --- Data States ---
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [notes, setNotes] = useState([]);
  
  // Loaders
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

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

  // 3. Fetch Notes (Filtered by Profile Type)
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const params = {
          page_size: 4, // Just a few for the home page
          profile_type: profileType,
          ordering: '-created_at' // Show latest
        };
        const response = await publicNoteAPI.browse(params);
        setNotes(response.results || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
  }, [profileType]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans overflow-hidden">
      
      <HomeHero categories={categories} />

      <HomeLearningHub products={products} />
      
      <HomeCourses 
        products={products}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        loading={productsLoading}
      />

      <HomeNotes 
        notes={notes}
        loading={notesLoading}
      />

      <HomeTestimonials />

      <HomeBenefits />

      <HomeAbout />

    </div>
  );
}
