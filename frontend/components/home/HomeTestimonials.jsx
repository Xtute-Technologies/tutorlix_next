'use client';

import { Quote } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';

export default function HomeTestimonials() {
  const { activeHomeContent } = useProfile();
  const testimonials = activeHomeContent?.testimonials || {};
  const items = Array.isArray(testimonials.items) ? testimonials.items : [];

  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">{testimonials.title}</h2>
          <p className="text-slate-500 mt-2">{testimonials.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((t, i) => (
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
  );
}
