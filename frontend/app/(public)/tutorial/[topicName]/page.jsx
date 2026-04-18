'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useProfile } from '@/context/ProfileContext';

export default function TutorialTopicPage({ params }) {
  const { activeHomeContent, loading } = useProfile();
  const tutorials = Array.isArray(activeHomeContent?.tutorials) ? activeHomeContent.tutorials : [];
  const topic = tutorials.find((item) => item.slug === params.topicName);
  const conceptsCovered = Array.isArray(topic?.conceptsCovered) ? topic.conceptsCovered : [];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-slate-600">Loading tutorial...</CardContent>
        </Card>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Tutorial not found</h1>
            <p className="text-slate-600">
              This tutorial is not configured for the currently selected profile type.
            </p>
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4">
        <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <div className="space-y-3">
          <Badge variant="outline">{topic.scopeLabel}</Badge>
          <h1 className="text-4xl font-bold text-slate-900">{topic.title} Tutorial</h1>
          <p className="max-w-3xl text-lg text-slate-600">{topic.shortDescription}</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-slate-900">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">What this tutorial covers</h2>
          </div>
          <p className="leading-7 text-slate-700">{topic.overview}</p>
        </CardContent>
      </Card>

      {conceptsCovered.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">Core concepts</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {conceptsCovered.map((concept) => (
                concept.noteUrl ? (
                  <Link
                    key={concept.slug || concept.title}
                    href={concept.noteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    {concept.title}
                  </Link>
                ) : (
                  <div
                    key={concept.slug || concept.title}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {concept.title}
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-5">
          <h2 className="text-xl font-semibold text-slate-900">Key learning outcomes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {topic.learnPoints.map((point) => (
              <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-600" />
                <p className="text-sm leading-6 text-slate-700">{point}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
