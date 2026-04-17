'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { questionBankCourseAPI, questionBankQuestionAPI } from '@/lib/lmsService';
import { useProfile } from '@/context/ProfileContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function QuestionBankTopicPage() {
  const params = useParams();
  const { profileType } = useProfile();
  const courseSlug = params?.courseName;
  const topicSlug = params?.topicName;
  const [course, setCourse] = useState(null);
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loadTopic = async () => {
      try {
        setLoading(true);
        setMissing(false);

        const courseData = await questionBankCourseAPI.getBySlug(courseSlug, { profile_type: profileType });
        const matchedTopic = courseData.topics?.find((item) => item.slug === topicSlug);

        if (!matchedTopic) {
          setMissing(true);
          return;
        }

        const questionData = await questionBankQuestionAPI.getAll({ topic: matchedTopic.id });

        setCourse(courseData);
        setTopic(matchedTopic);
        setQuestions(Array.isArray(questionData) ? questionData : []);
      } catch (error) {
        console.error('Failed to load question bank topic:', error);
        setMissing(true);
      } finally {
        setLoading(false);
      }
    };

    if (courseSlug && topicSlug) {
      loadTopic();
    }
  }, [courseSlug, topicSlug, profileType]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">Loading...</div>;
  }

  if (missing || !course || !topic) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Topic not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            The requested syllabus topic could not be loaded.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="px-0">
          <Link href={`/question-bank/${course.slug}`}>Back to Topics</Link>
        </Button>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{course.class_label}</Badge>
            <Badge variant="secondary">{course.grade_label}</Badge>
            <Badge variant="outline">{topic.title}</Badge>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{topic.title}</h1>
            <p className="mt-2 max-w-3xl text-gray-600">{topic.summary}</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
          <p className="text-sm text-gray-600">{course.syllabus_label}</p>
        </div>
      </Card>

      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((item, index) => (
            <Card key={item.id} className="p-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Q{index + 1}</Badge>
                  <Badge variant="outline">{topic.title}</Badge>
                </div>

                <div className="text-lg font-medium leading-7 text-gray-900">
                  {item.question}
                </div>

                <div className="rounded-md bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
                  <span className="font-semibold text-foreground">Answer:</span>{' '}
                  {item.answer}
                </div>

                {(item.source_label || item.source_url) && (
                  <div className="text-xs text-muted-foreground">
                    Source: {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {item.source_label || item.source_url}
                      </a>
                    ) : item.source_label}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              No questions yet
            </h2>
            <p className="text-sm text-gray-600">
              This topic exists in the syllabus structure, but no questions have been added yet.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
