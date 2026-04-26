'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, GraduationCap, Loader2, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfile } from '@/context/ProfileContext';

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: 'high_school', label: 'High School' },
  { value: 'introductory', label: 'Introductory' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function formatDate(dateValue) {
  if (!dateValue) return null;

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateValue));
  } catch {
    return null;
  }
}

function prettifyLevel(level) {
  return level
    ? level
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '';
}

export default function OpenEdxCoursesPageClient() {
  const { profileType } = useProfile();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [level, setLevel] = useState('all');
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState({
    items: [],
    total: 0,
    totalPages: 1,
    stale: false,
    warning: '',
    catalogMeta: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, level]);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '12',
        });

        if (deferredQuery.trim()) {
          params.set('q', deferredQuery.trim());
        }

        if (level !== 'all') {
          params.set('level', level);
        }

        const response = await fetch(`/openedx-catalog?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load Open edX courses.');
        }

        if (!cancelled) {
          setCatalog({
            items: Array.isArray(data.items) ? data.items : [],
            total: data.total || 0,
            totalPages: data.totalPages || 1,
            stale: !!data.stale,
            warning: data.warning || '',
            catalogMeta: data.catalog || null,
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCatalog({ items: [], total: 0, totalPages: 1, stale: false, warning: '', catalogMeta: null });
          setError(fetchError.message || 'Failed to load Open edX courses.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [deferredQuery, level, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fff3e2_45%,#ffffff_100%)] p-6 sm:p-8 shadow-sm">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            Open edX
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Open edX Courses
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Browse Open edX catalog courses through a dedicated Tutorlix route backed by the authenticated edX Course Catalog API.
          </p>
          {catalog.catalogMeta ? (
            <p className="text-sm font-medium text-slate-700">
              Active catalog: <span className="font-semibold">{catalog.catalogMeta.name}</span>
            </p>
          ) : null}
          {['college', 'professional'].includes(profileType) ? (
            <p className="text-sm font-medium text-slate-700">
              Showing this in navigation for the current profile: <span className="capitalize">{profileType}</span>.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Open edX courses"
            className="h-11 pl-10"
          />
        </div>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {!loading && catalog.stale && catalog.warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {catalog.warning}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading Open edX courses...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : catalog.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No Open edX courses matched the current filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {catalog.items.map((item) => (
            <Card key={item.key} className="h-full border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {item.level ? <Badge variant="secondary">{prettifyLevel(item.level)}</Badge> : null}
                  {item.partner ? <Badge variant="outline">{item.partner}</Badge> : null}
                </div>
                <CardTitle className="text-xl leading-tight text-slate-900">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="line-clamp-4 text-sm leading-7 text-slate-600">
                  {item.shortDescription || item.fullDescription || 'Open edX course information from the authenticated course catalog.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.subjects.slice(0, 3).map((subject) => (
                    <span key={`${item.key}-${subject}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {subject}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{item.runs.length} run{item.runs.length === 1 ? '' : 's'}</span>
                  </div>
                  <span>{formatDate(item.modified) || 'Recently updated'}</span>
                </div>

                {item.marketingUrl ? (
                  <Button asChild className="w-full gap-2">
                    <Link href={item.marketingUrl} target="_blank" rel="noreferrer">
                      Open course
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {catalog.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {catalog.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= catalog.totalPages || loading}
            onClick={() => setPage((current) => Math.min(catalog.totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
