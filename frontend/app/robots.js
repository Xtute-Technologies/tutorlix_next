import { SITE_URL } from '@/lib/siteMetadata';

export const dynamic = 'force-dynamic';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/teacher/',
          '/student/',
          '/profile/',
          '/seller/',
          '/public-payment/',
          '/payment-success',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
