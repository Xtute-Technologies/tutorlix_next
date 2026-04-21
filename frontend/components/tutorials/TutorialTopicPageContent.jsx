'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TutorlixRenderer from '@/components/notes/TutorlixRenderer';
import { useProfile } from '@/context/ProfileContext';
import { buildProfileHomeContent } from '@/app/data/homeContent';
import { publicNoteAPI } from '@/lib/notesService';
import { cn } from '@/lib/utils';

function extractNoteSlug(noteUrl) {
  if (!noteUrl || typeof noteUrl !== 'string') return null;

  try {
    const parsed = new URL(noteUrl, 'http://localhost');
    const segments = parsed.pathname.split('/').filter(Boolean);
    const notesIndex = segments.findIndex((segment) => segment === 'notes');
    if (notesIndex === -1 || notesIndex === segments.length - 1) return null;
    return segments[notesIndex + 1];
  } catch {
    return null;
  }
}

function normalizeTutorialPages(topic) {
  if (!topic) return [];
  if (Array.isArray(topic.pages)) return topic.pages;
  return [{
    slug: topic.slug,
    title: topic.title,
    shortDescription: topic.shortDescription,
    overview: topic.overview,
    conceptsCovered: topic.conceptsCovered,
    learnPoints: topic.learnPoints,
    scopeLabel: topic.scopeLabel,
  }];
}

export default function TutorialTopicPageContent({ topicName, pageSlug = null }) {
  const { activeHomeContent, profileTypes, loading } = useProfile();
  const [selectedConceptSlug, setSelectedConceptSlug] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState(null);

  const tutorials = Array.isArray(activeHomeContent?.tutorials) ? activeHomeContent.tutorials : [];
  const allTutorials = [
    ...tutorials,
    ...profileTypes.flatMap((profile) => {
      const content = buildProfileHomeContent(profile.slug, profile.home_content);
      return Array.isArray(content?.tutorials) ? content.tutorials : [];
    }),
  ];

  const topic =
    tutorials.find((item) => item.slug === topicName) ||
    allTutorials.find((item) => item.slug === topicName);
  const tutorialPages = normalizeTutorialPages(topic);
  const selectedPage =
    tutorialPages.find((page) => page.slug === pageSlug) ||
    tutorialPages[0] ||
    null;
  const conceptsCovered = Array.isArray(selectedPage?.conceptsCovered) ? selectedPage.conceptsCovered : [];

  const linkedConcepts = useMemo(
    () => conceptsCovered.filter((concept) => extractNoteSlug(concept.noteUrl)),
    [conceptsCovered]
  );

  const selectedConcept =
    conceptsCovered.find((concept) => concept.slug === selectedConceptSlug) ||
    linkedConcepts[0] ||
    conceptsCovered[0] ||
    null;
  const selectedNoteSlug = extractNoteSlug(selectedConcept?.noteUrl);

  useEffect(() => {
    if (!conceptsCovered.length) {
      setSelectedConceptSlug(null);
      return;
    }

    const nextSelected = conceptsCovered.find((concept) => concept.slug === selectedConceptSlug);
    if (nextSelected) return;

    setSelectedConceptSlug((linkedConcepts[0] || conceptsCovered[0]).slug);
  }, [conceptsCovered, linkedConcepts, selectedConceptSlug]);

  useEffect(() => {
    if (!selectedNoteSlug) {
      setSelectedNote(null);
      setNoteError(null);
      setNoteLoading(false);
      return;
    }

    let cancelled = false;

    const loadNote = async () => {
      setNoteLoading(true);
      setNoteError(null);
      try {
        const data = await publicNoteAPI.getDetail(selectedNoteSlug);
        if (!cancelled) setSelectedNote(data);
      } catch (error) {
        if (!cancelled) {
          setSelectedNote(null);
          setNoteError(error.response?.data?.detail || 'Failed to load the attached note.');
        }
      } finally {
        if (!cancelled) setNoteLoading(false);
      }
    };

    loadNote();
    return () => {
      cancelled = true;
    };
  }, [selectedNoteSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            <p className="text-slate-600">This tutorial is not configured for the currently selected profile type.</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-4">
        <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <div className="space-y-3">
          {selectedPage?.scopeLabel ? <Badge variant="outline">{selectedPage.scopeLabel}</Badge> : null}
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{selectedPage?.title || topic.title}</h1>
          {selectedPage?.shortDescription ? (
            <p className="max-w-3xl text-base text-slate-600 sm:text-lg">{selectedPage.shortDescription}</p>
          ) : topic.description ? (
            <p className="max-w-3xl text-base text-slate-600 sm:text-lg">{topic.description}</p>
          ) : null}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-slate-900">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">What this tutorial covers</h2>
          </div>
          <p className="leading-7 text-slate-700">{selectedPage?.overview || 'This tutorial page does not have an overview yet.'}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="border-slate-200 shadow-sm lg:sticky lg:top-24 lg:h-fit">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Core concepts</h2>
              </div>
              <p className="text-sm text-slate-600">Select a concept to preview its attached note.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {conceptsCovered.map((concept) => {
                const isActive = concept.slug === selectedConcept?.slug;
                const hasNote = !!extractNoteSlug(concept.noteUrl);

                return (
                  <button
                    key={concept.slug || concept.title}
                    type="button"
                    onClick={() => setSelectedConceptSlug(concept.slug)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold leading-5">{concept.title}</div>
                      <div className={cn('text-xs', isActive ? 'text-slate-300' : 'text-slate-500')}>
                        {hasNote ? 'Attached note available' : 'No note attached'}
                      </div>
                    </div>
                    {hasNote ? (
                      <ChevronRight className={cn('mt-0.5 h-4 w-4 flex-none', isActive ? 'text-white' : 'text-slate-400')} />
                    ) : (
                      <Lock className={cn('mt-0.5 h-4 w-4 flex-none', isActive ? 'text-slate-300' : 'text-slate-300')} />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 min-w-0">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3 text-slate-900">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{selectedConcept?.title || 'Concept notes'}</h2>
              </div>

              {!selectedConcept ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                  No core concepts are configured for this tutorial yet.
                </div>
              ) : !selectedNoteSlug ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                  This concept does not have a note URL attached yet.
                </div>
              ) : noteLoading ? (
                <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border bg-slate-50 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-sm">Loading attached note...</p>
                </div>
              ) : noteError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">{noteError}</div>
              ) : selectedNote ? (
                <div className="space-y-6">
                  <div className="space-y-3 rounded-2xl border bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{selectedNote.note_type === 'course_specific' ? 'Course note' : 'Note'}</Badge>
                      {selectedNote.privacy ? <Badge variant="secondary">{selectedNote.privacy}</Badge> : null}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-slate-900">{selectedNote.title}</h3>
                      {selectedNote.description ? <p className="text-sm leading-7 text-slate-600">{selectedNote.description}</p> : null}
                    </div>
                    {selectedConcept?.noteUrl ? (
                      <div className="pt-1">
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link href={selectedConcept.noteUrl}>Open full note page</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {selectedNote.content ? (
                    <div className="rounded-2xl border bg-white p-4 md:p-6 overflow-hidden">
                      <TutorlixRenderer content={selectedNote.content} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                      This attached note page is available, but its full content is not publicly visible from this tutorial view.
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Key learning outcomes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {(Array.isArray(selectedPage?.learnPoints) ? selectedPage.learnPoints : []).map((point) => (
                  <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-600" />
                    <p className="text-sm leading-6 text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
