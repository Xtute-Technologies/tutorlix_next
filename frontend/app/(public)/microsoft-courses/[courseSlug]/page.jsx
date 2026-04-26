import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen, Clock3, GraduationCap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { decodeMicrosoftCourseSlug, encodeMicrosoftCourseSlug } from '@/lib/microsoftCatalog';
import {
  resolveMicrosoftCourseDetail,
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
    const detail = await resolveMicrosoftCourseDetail(decodedSlug, { locale: 'en-us' });
    const course = detail.course || createFallbackCourse(courseSlugParam || '');
    const title = `${course.title} | Microsoft Courses | Tutorlix`;
    const description = course.summary || course.subtitle || 'Microsoft Learn content available through Tutorlix.';
    const canonicalSlug = course.url || course.slug || decodedSlug;
    const canonical = `https://tutorlix.com/microsoft-courses/${encodeMicrosoftCourseSlug(canonicalSlug)}`;

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
  const detail = await resolveMicrosoftCourseDetail(decodedSlug, { locale: 'en-us' });
  const course = detail.course || createFallbackCourse(courseSlugParam || '');

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

      {detail.warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {detail.warning}
        </div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5 sm:p-6 md:p-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock3 className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold">Estimated time</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{formatDuration(course.duration_in_minutes) || course.scrapedDurationLabel || 'Self-paced'}</p>
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

          {course.learningObjectives?.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Learning Objectives</h2>
              <ul className="space-y-2 text-slate-700">
                {course.learningObjectives.map((objective) => (
                  <li key={`${course.slug}-${objective}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-600" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {course.prerequisites?.length ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Prerequisites</h2>
              <ul className="space-y-2 text-slate-700">
                {course.prerequisites.map((prerequisite) => (
                  <li key={`${course.slug}-${prerequisite}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{prerequisite}</span>
                  </li>
                ))}
              </ul>
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
