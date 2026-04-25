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

const TYPE_OPTIONS = [
  { value: 'learningPaths', label: 'Learning Paths' },
  { value: 'modules', label: 'Modules' },
  { value: 'courses', label: 'Instructor-Led Courses' },
  { value: 'all', label: 'All Types' },
];

function formatDuration(durationInMinutes) {
  if (!durationInMinutes) return null;
  if (durationInMinutes < 60) return `${durationInMinutes} min`;

  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

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

export default function MicrosoftCoursesPageClient() {
  const { profileType } = useProfile();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [type, setType] = useState('learningPaths');
  const [level, setLevel] = useState('all');
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState({
    items: [],
    total: 0,
    totalPages: 1,
    availableLevels: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, type, level]);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          type,
          page: String(page),
          pageSize: '12',
        });

        if (deferredQuery.trim()) {
          params.set('q', deferredQuery.trim());
        }

        if (level !== 'all') {
          params.set('level', level);
        }

        const response = await fetch(`/microsoft-catalog?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load Microsoft courses.');
        }

        if (!cancelled) {
          setCatalog({
            items: Array.isArray(data.items) ? data.items : [],
            total: data.total || 0,
            totalPages: data.totalPages || 1,
            availableLevels: Array.isArray(data.availableLevels) ? data.availableLevels : [],
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCatalog({ items: [], total: 0, totalPages: 1, availableLevels: [] });
          setError(fetchError.message || 'Failed to load Microsoft courses.');
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
  }, [deferredQuery, type, level, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f5f9ff_0%,#eef4ff_45%,#ffffff_100%)] p-6 sm:p-8 shadow-sm">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            Microsoft Learn
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Microsoft Courses
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Browse Microsoft Learn catalog content through a dedicated Tutorlix route. This page links directly to Microsoft Learn offerings.
          </p>
          {['college', 'professional'].includes(profileType) ? (
            <p className="text-sm font-medium text-slate-700">
              Showing this in navigation for the current profile: <span className="capitalize">{profileType}</span>.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              This route is available to everyone, but it is highlighted in navigation for college students and IT professionals.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px_200px] sm:p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Microsoft learning paths, modules, or courses"
            className="h-11 pl-10"
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {catalog.availableLevels.map((itemLevel) => (
              <SelectItem key={itemLevel} value={itemLevel}>
                {itemLevel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          {loading ? 'Loading Microsoft catalog...' : `${catalog.total} results found`}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading Microsoft courses...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : catalog.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No Microsoft courses matched the current filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {catalog.items.map((item) => (
            <Card key={item.uid} className="h-full border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.typeLabel}</Badge>
                  {item.levels.slice(0, 1).map((itemLevel) => (
                    <Badge key={`${item.uid}-${itemLevel}`} variant="secondary" className="capitalize">
                      {itemLevel}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-xl leading-tight text-slate-900">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="line-clamp-4 text-sm leading-7 text-slate-600">
                  {item.summary || 'Microsoft Learn content with direct access to the official training page.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.roles.slice(0, 3).map((role) => (
                    <span key={`${item.uid}-${role}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                      {role}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{formatDuration(item.duration_in_minutes) || 'Self-paced'}</span>
                  </div>
                  <span>{formatDate(item.last_modified) || 'Recently updated'}</span>
                </div>

                <Button asChild className="w-full gap-2">
                  <Link href={item.url} target="_blank" rel="noreferrer">
                    Open on Microsoft Learn
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
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
