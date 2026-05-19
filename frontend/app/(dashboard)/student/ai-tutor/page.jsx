'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Bot, BookOpen, CalendarDays, Loader2, PhoneCall } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { aiTutorAPI } from '@/lib/lmsService';

const formatExpiry = (value) => {
  if (!value) return 'Lifetime access';
  return `Active until ${new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
};

const errorText = (err) => {
  const data = err.response?.data;
  const value = data?.detail || data?.livekit || data?.error || data?.non_field_errors;
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.values(value).flat().join(' ');
  return 'Could not load AI tutor courses.';
};

export default function StudentAITutorPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setError('');
        setLoading(true);
        const data = await aiTutorAPI.getCourses();
        setCourses(Array.isArray(data?.courses) ? data.courses : []);
      } catch (err) {
        setError(errorText(err));
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Tutor</h1>
          <p className="text-sm text-muted-foreground">Course doubt calls for your active enrollments.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 px-3 py-1">
          <Bot className="h-4 w-4" />
          Groq voice
        </Badge>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      ) : null}

      {courses.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold">No active course access</h2>
          <p className="mt-1 text-sm text-muted-foreground">AI tutor calls unlock for paid, active course bookings.</p>
          <Button asChild className="mt-5">
            <Link href="/student/bookings">View Bookings</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="flex min-h-56 flex-col justify-between rounded-md border bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-slate-950">{course.name}</h2>
                    {course.category ? (
                      <p className="mt-1 truncate text-xs font-medium uppercase text-slate-500">{course.category}</p>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-slate-100 p-2">
                    <Bot className="h-5 w-5 text-slate-700" />
                  </div>
                </div>

                {course.description ? (
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                ) : null}

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span>{formatExpiry(course.course_expiry_date)}</span>
                </div>
              </div>

              <Button asChild className="mt-5 w-full">
                <Link href={`/student/ai-tutor/${course.id}`}>
                  <PhoneCall className="h-4 w-4" />
                  Start AI Call
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
