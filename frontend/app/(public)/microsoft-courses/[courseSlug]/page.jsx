import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BookOpen, Clock3, GraduationCap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { decodeMicrosoftCourseSlug, encodeMicrosoftCourseSlug, findMicrosoftCourseBySlug } from '@/lib/microsoftCatalog';
import {
  buildMicrosoftCacheKey,
  fetchMicrosoftCatalogSnapshot,
  readMicrosoftCatalogSnapshotCache,
  resolveMicrosoftTypes,
} from '@/lib/microsoftCatalogServer';

function formatDuration(durationInMinutes) {
  if (!durationInMinutes) return null;
  if (durationInMinutes < 60) return `${durationInMinutes} min`;

  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function createFallbackCourse(slug) {
  const title = decodeMicrosoftCourseSlug(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    slug: decodeMicrosoftCourseSlug(slug),
    title: title || 'Microsoft Course',
    summary: 'Microsoft Learn content available through Tutorlix.',
    subtitle: '',
    url: '',
    icon_url: '',
    social_image_url: '',
    duration_in_minutes: 0,
    levels: [],
    roles: [],
    products: [],
    subjects: [],
    typeLabel: 'Microsoft Learn',
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const courseSlugParam = resolvedParams?.courseSlug;
  const decodedSlug = decodeMicrosoftCourseSlug(courseSlugParam || '');

  try {
    let snapshot;
    try {
      snapshot = await fetchMicrosoftCatalogSnapshot({ requestedType: 'all' });
    } catch {
      const cacheKey = buildMicrosoftCacheKey('en-us', resolveMicrosoftTypes('all'));
      const cachedSnapshot = await readMicrosoftCatalogSnapshotCache(cacheKey);
      snapshot = cachedSnapshot ? { items: cachedSnapshot.items } : null;
    }
    const course = snapshot ? (findMicrosoftCourseBySlug(snapshot.items, decodedSlug) || createFallbackCourse(courseSlugParam || '')) : createFallbackCourse(courseSlugParam || '');
    const title = `${course.title} | Microsoft Courses | Tutorlix`;
    const description = course.summary || course.subtitle || 'Microsoft Learn content available through Tutorlix.';
    const canonical = `https://tutorlix.com/microsoft-courses/${encodeMicrosoftCourseSlug(course.slug || decodedSlug)}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'Tutorlix',
        type: 'article',
        images: [course.social_image_url || course.icon_url || 'https://tutorlix.com/icon.png'],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [course.social_image_url || course.icon_url || 'https://tutorlix.com/icon.png'],
      },
    };
  } catch {
    return {
      title: 'Microsoft Course | Tutorlix',
      description: 'Microsoft Learn course details on Tutorlix.',
    };
  }
}

export default async function MicrosoftCourseDetailPage({ params }) {
  const resolvedParams = await params;
  const courseSlugParam = resolvedParams?.courseSlug;
  const decodedSlug = decodeMicrosoftCourseSlug(courseSlugParam || '');

  let course = null;

  try {
    const snapshot = await fetchMicrosoftCatalogSnapshot({ requestedType: 'all' });
    course = findMicrosoftCourseBySlug(snapshot.items, decodedSlug);
  } catch {
    const cacheKey = buildMicrosoftCacheKey('en-us', resolveMicrosoftTypes('all'));
    const cachedSnapshot = await readMicrosoftCatalogSnapshotCache(cacheKey);
    course = cachedSnapshot ? findMicrosoftCourseBySlug(cachedSnapshot.items || [], decodedSlug) : null;
  }

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="space-y-4">
        <Link href="/microsoft-courses" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Microsoft Courses
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.typeLabel}</Badge>
            {course.levels.map((level) => (
              <Badge key={`${course.slug}-${level}`} variant="secondary">
                {level}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{course.title}</h1>
          <p className="max-w-3xl text-base leading-8 text-slate-600">
            {course.summary || course.subtitle || 'Microsoft Learn course details available inside Tutorlix.'}
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5 sm:p-6 md:p-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock3 className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold">Estimated time</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{formatDuration(course.duration_in_minutes) || 'Self-paced'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold">Roles</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{course.roles.length ? course.roles.join(', ') : 'General learner audience'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <BookOpen className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold">Products</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{course.products.length ? course.products.join(', ') : 'Microsoft Learn content'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="leading-8 text-slate-700">
              {course.summary || 'This Microsoft Learn item is available through the Microsoft catalog integrated into Tutorlix.'}
            </p>
            {course.subtitle ? (
              <p className="leading-8 text-slate-600">{course.subtitle}</p>
            ) : null}
          </div>

          {course.subjects.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Subjects</h2>
              <div className="flex flex-wrap gap-2">
                {course.subjects.map((subject) => (
                  <span key={`${course.slug}-${subject}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {course.url ? (
            <div className="pt-2">
              <Button asChild className="gap-2">
                <Link href={course.url} target="_blank" rel="noreferrer">
                  Microsoft Learn
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
