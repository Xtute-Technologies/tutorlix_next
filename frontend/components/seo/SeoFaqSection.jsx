'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import JsonLd from '@/components/seo/JsonLd';
import { buildFaqSchema } from '@/lib/seo';

export default function SeoFaqSection({ title = 'Frequently Asked Questions', description, faqs = [] }) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-white py-14">
      <JsonLd data={buildFaqSchema(faqs)} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="mt-3 text-slate-600">{description}</p>}
        </div>
        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-4xl space-y-4">
          {faqs.map((item, index) => (
            <AccordionItem key={`${item.question}-${index}`} value={`faq-${index}`} className="rounded-2xl border border-slate-200 px-5">
              <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-6 text-slate-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
