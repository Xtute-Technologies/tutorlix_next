import MicrosoftCoursesPageClient from '@/components/public/MicrosoftCoursesPageClient';

export const metadata = {
  title: 'Microsoft Courses | Tutorlix',
  description: 'Browse Microsoft Learn catalog content from a dedicated Tutorlix route for college students and IT professionals.',
  alternates: {
    canonical: 'https://tutorlix.com/microsoft-courses',
  },
  openGraph: {
    title: 'Microsoft Courses | Tutorlix',
    description: 'Browse Microsoft Learn catalog content from a dedicated Tutorlix route for college students and IT professionals.',
    url: 'https://tutorlix.com/microsoft-courses',
    siteName: 'Tutorlix',
    type: 'website',
    images: ['https://tutorlix.com/icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Microsoft Courses | Tutorlix',
    description: 'Browse Microsoft Learn catalog content from a dedicated Tutorlix route for college students and IT professionals.',
    images: ['https://tutorlix.com/icon.png'],
  },
};

export default function MicrosoftCoursesPage() {
  return <MicrosoftCoursesPageClient />;
}
