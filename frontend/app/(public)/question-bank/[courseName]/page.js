'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { questionBankCourseAPI } from '@/lib/lmsService';
import { useProfile } from '@/context/ProfileContext';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function QuestionBankCoursePage() {
  const params = useParams();
  const { profileType } = useProfile();
  const courseSlug = params?.courseName;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        setMissing(false);
        const data = await questionBankCourseAPI.getBySlug(courseSlug, { profile_type: profileType });
        setCourse(data);
      } catch (error) {
        console.error('Failed to load question bank course:', error);
        setMissing(true);
      } finally {
        setLoading(false);
      }
    };

    if (courseSlug) {
      loadCourse();
    }
  }, [courseSlug, profileType]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">Loading...</div>;
  }

  if (missing || !course) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Course not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            The requested question bank course could not be loaded.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/question-bank">Back to Question Bank</Link>
        </Button>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{course.class_label}</Badge>
            <Badge variant="secondary">{course.grade_label}</Badge>
            <Badge variant="outline">{course.subject}</Badge>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{course.title}</h1>
            <p className="mt-2 max-w-3xl text-gray-600">{course.description}</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Syllabus Source</h2>
          <p className="text-sm text-gray-600">
            Topics below are organized using the official IB syllabus structure for this course.
          </p>
          {course.syllabus_source_url && (
            <a
              href={course.syllabus_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md border px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-muted/50"
            >
              {course.syllabus_label || 'Open syllabus source'}
            </a>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {course.topics?.map((topic) => (
          <Link
            key={topic.id}
            href={`/question-bank/${course.slug}/${topic.slug}`}
            className="group"
          >
            <Card className="h-full p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary">
                      {topic.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {topic.summary}
                    </p>
                  </div>
                  <Badge variant="outline">{topic.question_count || 0} questions</Badge>
                </div>

                <div className="pt-2 text-sm text-muted-foreground">
                  Open topic questions
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
