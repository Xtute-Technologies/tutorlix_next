import { getSitemapEntries } from '@/lib/siteMetadata';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  return getSitemapEntries();
}
