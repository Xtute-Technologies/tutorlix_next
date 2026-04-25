import { redirect } from 'next/navigation';

import TutorialTopicPageContent from '@/components/tutorials/TutorialTopicPageContent';
import { findTutorialSeoEntry } from '@/lib/tutorialSeo';

const FALLBACK_TITLE = 'Tutorials | Tutorlix';
const FALLBACK_DESCRIPTION = 'Explore guided tutorials on Tutorlix.';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const topicName = resolvedParams?.topicName;
  const { tutorial, page } = await findTutorialSeoEntry(topicName);

  if (!tutorial) {
    return {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
    };
  }

  const title = `${page?.title || tutorial.title} | Tutorlix`;
  const description = page?.shortDescription || tutorial.description || tutorial.overview || FALLBACK_DESCRIPTION;
  const canonical = `https://tutorlix.com/tutorial/${topicName}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Tutorlix',
      type: 'article',
      images: ['https://tutorlix.com/icon.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://tutorlix.com/icon.png'],
    },
  };
}

export default async function TutorialGroupPage({ params }) {
  const resolvedParams = await params;
  const topicName = resolvedParams?.topicName;
  const { tutorial, page } = await findTutorialSeoEntry(topicName);

  if (tutorial && page?.slug && page.slug !== topicName) {
    redirect(`/tutorial/${topicName}/${page.slug}`);
  }

  return <TutorialTopicPageContent topicName={topicName} />;
}
