'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { questionBankCourseAPI } from '@/lib/lmsService';
import { useProfile } from '@/context/ProfileContext';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SeoFaqSection from '@/components/seo/SeoFaqSection';
import { getSeoProfileContent } from '@/lib/seo';

export default function PublicQuestionBankPage() {
  const { profileType, activeHomeContent } = useProfile();
  const seoContent = activeHomeContent?.seo || getSeoProfileContent(profileType);
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const isSchoolProfile = profileType === 'school';

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const data = await questionBankCourseAPI.getAll({ profile_type: profileType });
        setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load question bank courses:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [profileType]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      const haystack = [
        course.title,
        course.subject,
        course.grade_label,
        course.class_label,
        course.description,
        course.syllabus_label,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [courses, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4">
        <Badge variant="outline">Public Question Bank</Badge>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">{seoContent.questionBank.title}</h1>
          <p className="max-w-4xl text-gray-600">
            {seoContent.questionBank.description}
          </p>
        </div>
      </div>

      <Card className="border-slate-200 bg-slate-50 p-6">
        <h2 className="text-2xl font-bold text-slate-900">{seoContent.questionBank.introTitle}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 md:text-base">
          {seoContent.questionBank.introDescription}{' '}
          Learners can strengthen weak areas with
          <Link href="/courses" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">live classes and courses</Link>
          and
          <Link href="/notes" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">study notes</Link>
          for a more complete study plan.
        </p>
      </Card>

      {!isSchoolProfile ? (
        <Card className="p-6 text-sm text-muted-foreground">
          {seoContent.questionBank.emptyState}
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search IB Mathematics courses, topics, or questions..."
                className="pl-9"
              />
            </div>
          </Card>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="h-56 animate-pulse p-6" />
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredCourses.map((course) => (
                <Link key={course.id} href={`/question-bank/${course.slug}`} className="group">
                  <Card className="h-full p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary">
                            {course.title}
                          </h2>
                          <p className="text-sm text-gray-600">{course.description}</p>
                        </div>
                        <Badge variant="outline">{course.topic_count || 0} topics</Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge>{course.class_label}</Badge>
                        <Badge variant="secondary">{course.grade_label}</Badge>
                        <Badge variant="outline">{course.subject}</Badge>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        {course.syllabus_label}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-muted-foreground">
                          Open syllabus topics
                        </span>
                        <Button variant="outline" size="sm">
                          View Topics
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">No courses found</h2>
                <p className="text-sm text-gray-600">
                  Try a different search term for the available question bank courses.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      <SeoFaqSection
        title="Question Bank FAQs"
        description={seoContent.questionBank.faqDescription}
        faqs={seoContent.questionBank.faqs}
      />
    </div>
  );
}
