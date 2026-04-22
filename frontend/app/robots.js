import { SITE_URL } from '@/lib/siteMetadata';

export const dynamic = 'force-dynamic';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/public-payment/', '/payment-success'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
