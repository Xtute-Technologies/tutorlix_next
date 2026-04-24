import HomePageClient from '@/components/public/HomePageClient';

export const metadata = {
  title: 'Online Courses for Maths, Full Stack Development, DSA & AI | Tutorlix',
  description:
    'Learn online with Tutorlix through maths tutoring, full stack development, DSA, system design, AI and generative AI courses.',
  alternates: {
    canonical: 'https://tutorlix.com/',
  },
  openGraph: {
    title: 'Online Courses for Maths, Full Stack Development, DSA & AI | Tutorlix',
    description:
      'Learn online with Tutorlix through maths tutoring, full stack development, DSA, system design, AI and generative AI courses.',
    url: 'https://tutorlix.com/',
    siteName: 'Tutorlix',
    type: 'website',
    images: ['https://tutorlix.com/icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Courses for Maths, Full Stack Development, DSA & AI | Tutorlix',
    description:
      'Learn online with Tutorlix through maths tutoring, full stack development, DSA, system design, AI and generative AI courses.',
    images: ['https://tutorlix.com/icon.png'],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
