'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import QuestionBankManager from '@/components/question-bank/QuestionBankManager';
import { useAuth } from '@/context/AuthContext';

export default function TeacherQuestionBankPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return <QuestionBankManager roleLabel="My Question Bank" />;
}
