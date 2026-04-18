'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, LibraryBig, Search } from 'lucide-react';

import { useProfile } from '@/context/ProfileContext';
import { questionBankCourseAPI } from '@/lib/lmsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomeLearningHub({ products = [] }) {
  const { profileType, activeHomeContent } = useProfile();
  const isSchoolProfile = profileType === 'school';
  const questionBanksUrl = activeHomeContent?.navigation?.question_banks_url || '/question-banks';
  const questionBanksLabel = activeHomeContent?.navigation?.question_banks_label || 'Question Banks';
  const featuredCourses = products.slice(0, 3);
  const [questionBankCourses, setQuestionBankCourses] = useState([]);

  useEffect(() => {
    const loadQuestionBankCourses = async () => {
      try {
        const data = await questionBankCourseAPI.getAll({ profile_type: profileType });
        setQuestionBankCourses(Array.isArray(data) ? data.slice(0, 2) : []);
      } catch (error) {
        console.error('Failed to load question bank courses:', error);
        setQuestionBankCourses([]);
      }
    };

    loadQuestionBankCourses();
  }, [profileType]);

  return (
    <section className="relative -mt-6 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-slate-200 shadow-xl">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_40%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_50%,#ffffff_100%)] p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-slate-900 text-white hover:bg-slate-900">{questionBanksLabel}</Badge>
                <Badge variant="outline">Class 11</Badge>
                <Badge variant="secondary">IB Mathematics</Badge>
              </div>

              <div className="mt-4 max-w-2xl space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Search question banks and jump straight into worked answers
                </h2>
                <p className="text-sm leading-6 text-slate-600 md:text-base">
                  Open database-backed question-bank courses matched to the active profile and move from course to topic to detailed practice questions.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="gap-2">
                  <Link href={questionBanksUrl}>
                    <Search className="h-4 w-4" />
                    Explore {questionBanksLabel}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {questionBankCourses.map((course) => (
                  <Link key={course.id} href={`/question-bank/${course.slug}`} className="group">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <LibraryBig className="h-5 w-5 text-blue-600" />
                        <Badge variant="outline">
                          {course.question_count || 0} questions
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary">
                          {course.title}
                        </h3>
                        <p className="text-sm leading-5 text-slate-600 line-clamp-3">
                          {course.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}

                {questionBankCourses.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500 md:col-span-2">
                    Question bank courses will appear here after they are added to the database.
                  </div>
                )}
              </div>

              {!isSchoolProfile && (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  Question-bank courses are filtered by the currently selected profile type.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-slate-200 p-5 md:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline">Featured Courses</Badge>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                  Courses remain one click away
                </h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  Keep both learning paths visible: structured course discovery and direct question practice.
                </p>
              </div>
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>

            <div className="mt-4 space-y-3">
              {featuredCourses.length > 0 ? (
                featuredCourses.map((product) => (
                  <Link
                    key={product.id}
                    href={`/courses/${product.id}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 transition-all hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-primary">
                        {product.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.category_name || 'Course'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-none text-slate-400 group-hover:translate-x-1 group-hover:text-slate-700" />
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                  Featured courses will appear here once products load.
                </div>
              )}
            </div>

            <div className="mt-4">
              <Button asChild variant="ghost" className="px-0 text-slate-700">
                <Link href="/courses">
                  View all courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
