'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { categoryAPI, productAPI } from '@/lib/lmsService';
import { publicNoteAPI } from '@/lib/notesService';
import { useProfile } from '@/context/ProfileContext';
import HomeHero from '@/components/home/HomeHero';
import HomeLearningHub from '@/components/home/HomeLearningHub';
import HomeCourses from '@/components/home/HomeCourses';
import HomeNotes from '@/components/home/HomeNotes';
import HomeBenefits from '@/components/home/HomeBenefits';
import HomeAbout from '@/components/home/HomeAbout';
import HomeTestimonials from '@/components/home/HomeTestimonials';
import SeoFaqSection from '@/components/seo/SeoFaqSection';
import JsonLd from '@/components/seo/JsonLd';
import { buildOrganizationSchema, buildWebsiteSchema, getSeoProfileContent } from '@/lib/seo';

export default function HomePageClient() {
  const { profileType, activeHomeContent } = useProfile();
  const seoContent = activeHomeContent?.seo || getSeoProfileContent(profileType);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [notes, setNotes] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (categories.length === 0) setInitialLoading(true);
        const data = await categoryAPI.getAll({ profile_type: profileType });
        setCategories(Array.isArray(data) ? data : []);
        setActiveCategory('all');
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchCategories();
  }, [profileType]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const params = {
          page_size: 10,
          type: profileType,
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

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const response = await publicNoteAPI.browse({
          page_size: 4,
          profile_type: profileType,
          ordering: '-created_at',
        });
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
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-white font-sans">
      <JsonLd data={buildOrganizationSchema()} />
      <JsonLd data={buildWebsiteSchema()} />

      <HomeHero categories={categories} />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{seoContent.homepage.sectionTitle}</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {seoContent.homepage.sectionDescription}{' '}
            Explore{' '}
            <Link href="/courses" className="font-medium text-primary underline-offset-4 hover:underline">live classes and courses</Link>,
            <Link href="/question-bank" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">question banks</Link>,
            <Link href="/notes" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">study notes</Link>,
            <Link href="/masterclass" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">masterclasses</Link> and
            <Link href="/contact" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">contact support</Link> for the next step.
          </p>
        </div>
      </section>

      <HomeLearningHub products={products} />

      <HomeCourses
        products={products}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        loading={productsLoading}
      />

      <HomeNotes notes={notes} loading={notesLoading} />

      <HomeTestimonials />

      <HomeBenefits />

      <HomeAbout />

      <SeoFaqSection
        title="Frequently Asked Questions"
        description={seoContent.homepage.faqDescription}
        faqs={seoContent.homepage.faqs}
      />
    </div>
  );
}
