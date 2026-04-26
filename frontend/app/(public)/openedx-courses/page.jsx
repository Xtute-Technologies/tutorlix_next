import OpenEdxCoursesPageClient from '@/components/public/OpenEdxCoursesPageClient';

export const metadata = {
  title: 'Open edX Courses | Tutorlix',
  description: 'Browse Open edX catalog courses from a dedicated Tutorlix route for college students and IT professionals.',
  alternates: {
    canonical: 'https://tutorlix.com/openedx-courses',
  },
  openGraph: {
    title: 'Open edX Courses | Tutorlix',
    description: 'Browse Open edX catalog courses from a dedicated Tutorlix route for college students and IT professionals.',
    url: 'https://tutorlix.com/openedx-courses',
    siteName: 'Tutorlix',
    type: 'website',
    images: ['https://tutorlix.com/icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open edX Courses | Tutorlix',
    description: 'Browse Open edX catalog courses from a dedicated Tutorlix route for college students and IT professionals.',
    images: ['https://tutorlix.com/icon.png'],
  },
};

export default function OpenEdxCoursesPage() {
  return <OpenEdxCoursesPageClient />;
}
