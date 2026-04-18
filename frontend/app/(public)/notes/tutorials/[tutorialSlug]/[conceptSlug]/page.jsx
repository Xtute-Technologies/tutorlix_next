'use client';

import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import { ArrowLeft, BookOpen, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TutorialConceptNotePage({ params }) {
  const { activeHomeContent, loading } = useProfile();
  const tutorials = Array.isArray(activeHomeContent?.tutorials) ? activeHomeContent.tutorials : [];
  const tutorial = tutorials.find((item) => item.slug === params.tutorialSlug);
  const concept = Array.isArray(tutorial?.conceptsCovered)
    ? tutorial.conceptsCovered.find((item) => item.slug === params.conceptSlug)
    : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card><CardContent className="p-8 text-slate-600">Loading note...</CardContent></Card>
      </div>
    );
  }

  if (!tutorial || !concept) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Note not found</h1>
            <p className="text-slate-600">This concept note is not configured for the current profile type.</p>
            <Link href="/notes" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Notes
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notePoints = Array.isArray(concept.notePoints) ? concept.notePoints : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4">
        <Link href={`/tutorial/${tutorial.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Tutorial
        </Link>
        <div className="space-y-3">
          <Badge variant="outline">{tutorial.scopeLabel || 'Tutorial Notes'}</Badge>
          <h1 className="text-4xl font-bold text-slate-900">{concept.noteTitle || `${concept.title} Notes`}</h1>
          <p className="max-w-3xl text-lg text-slate-600">{concept.noteSummary}</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-slate-900">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Concept context</h2>
          </div>
          <p className="leading-7 text-slate-700">
            <strong>{concept.title}</strong> belongs to <strong>{tutorial.title}</strong>. These notes are meant to help you revise the idea clearly, understand where it appears in questions or projects, and connect it to surrounding concepts so your preparation becomes more structured.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3 text-slate-900">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Detailed notes</h2>
          </div>
          <div className="grid gap-4">
            {notePoints.map((point) => (
              <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-600" />
                <p className="text-sm leading-7 text-slate-700">{point}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
