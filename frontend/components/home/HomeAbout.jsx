'use client';

import { Badge } from '@/components/ui/badge';
import { Target, BrainCircuit } from 'lucide-react';

export default function HomeAbout() {
  return (
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
  );
}