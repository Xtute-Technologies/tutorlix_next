'use client';

import { use } from 'react';

import TutorialTopicPageContent from '@/components/tutorials/TutorialTopicPageContent';

export default function TutorialTopicDetailPage({ params }) {
  const { topicName, pageSlug } = use(params);

  return <TutorialTopicPageContent topicName={topicName} pageSlug={pageSlug} />;
}
