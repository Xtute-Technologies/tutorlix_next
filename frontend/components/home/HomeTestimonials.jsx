'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { Button } from '@/components/ui/button';

export default function HomeTestimonials() {
  const { activeHomeContent } = useProfile();
  const testimonials = activeHomeContent?.testimonials || {};
  const items = Array.isArray(testimonials.items) ? testimonials.items.filter((item) => item?.text) : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1280) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  const slides = useMemo(() => {
    if (!items.length) return [];
    return items.map((_, index) =>
      Array.from({ length: Math.min(visibleCount, items.length) }, (_, offset) => items[(index + offset) % items.length])
    );
  }, [items, visibleCount]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  if (!items.length) {
    return null;
  }

  const activeSlide = slides[currentIndex] || [];

  return (
    <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              {testimonials.title}
            </h2>
            <p className="mt-3 text-slate-600 text-base md:text-lg">
              {testimonials.subtitle}
            </p>
          </div>

          {slides.length > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className={`grid gap-5 ${visibleCount === 1 ? 'grid-cols-1' : visibleCount === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
          {activeSlide.map((review, index) => (
            <article
              key={`${review.name}-${review.course}-${currentIndex}-${index}`}
              className="relative h-full rounded-[2rem] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-emerald-50/40 p-6 shadow-sm"
            >
              <Quote className="absolute right-6 top-6 h-10 w-10 text-emerald-100" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                <p className="text-slate-700 leading-7 text-base">
                  "{review.text}"
                </p>
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <h3 className="text-lg font-bold text-slate-900">{review.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                    {review.course}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {slides.length > 1 ? (
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to review slide ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-slate-900' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
