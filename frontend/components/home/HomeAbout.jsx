'use client';

import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/context/ProfileContext';
import { FALLBACK_IMAGE, HOME_ICON_MAP } from '@/app/data/homeContent';

export default function HomeAbout() {
  const { activeHomeContent } = useProfile();
  const aboutContent = activeHomeContent?.about || {};
  const cards = Array.isArray(aboutContent.cards) ? aboutContent.cards : [];

  return (
    <section className="py-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div>
              <Badge variant="outline" className="mb-4 bg-white text-slate-900 border-slate-300">{aboutContent.badge}</Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight whitespace-pre-line">
                {aboutContent.title}
              </h2>
              <div className="prose prose-slate text-slate-600">
                <p className="text-base mb-4">
                  {aboutContent.description}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {cards.slice(0, 2).map((card, index) => {
                const Icon = HOME_ICON_MAP[card.icon] || HOME_ICON_MAP.target;
                return (
                  <div key={`${card.title}-${index}`} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <Icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">{card.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-900 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 opacity-80" />
              <img
                src={aboutContent.image_url || FALLBACK_IMAGE}
                alt="Students learning"
                className="w-full h-full object-cover mix-blend-overlay opacity-60"
              />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <p className="font-bold text-2xl mb-2">"{aboutContent.quote}"</p>
                <p className="text-purple-200">- {aboutContent.quote_author}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
