'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import TutorialTopicPageContent from '@/components/tutorials/TutorialTopicPageContent';
import { useProfile } from '@/context/ProfileContext';
import { buildProfileHomeContent } from '@/app/data/homeContent';

function normalizeTutorialPages(topic) {
  if (!topic) return [];
  if (Array.isArray(topic.pages)) return topic.pages;
  return topic.slug ? [topic] : [];
}

export default function TutorialGroupPage({ params }) {
  const { topicName } = use(params);
  const router = useRouter();
  const { activeHomeContent, profileTypes } = useProfile();

  useEffect(() => {
    const tutorials = Array.isArray(activeHomeContent?.tutorials) ? activeHomeContent.tutorials : [];
    const allTutorials = [
      ...tutorials,
      ...profileTypes.flatMap((profile) => {
        const content = buildProfileHomeContent(profile.slug, profile.home_content);
        return Array.isArray(content?.tutorials) ? content.tutorials : [];
      }),
    ];

    const topic =
      tutorials.find((item) => item.slug === topicName) ||
      allTutorials.find((item) => item.slug === topicName);
    const firstPage = normalizeTutorialPages(topic)[0];

    if (firstPage?.slug && firstPage.slug !== topicName) {
      router.replace(`/tutorial/${topicName}/${firstPage.slug}`);
    }
  }, [activeHomeContent?.tutorials, profileTypes, router, topicName]);

  return <TutorialTopicPageContent topicName={topicName} />;
}
