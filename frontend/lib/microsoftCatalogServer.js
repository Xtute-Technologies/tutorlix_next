import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  isMicrosoftLearnUrl,
  findMicrosoftCourseBySlug,
  filterCatalogItems,
  normalizeCatalogItems,
  sortCatalogItems,
} from '@/lib/microsoftCatalog';

const MICROSOFT_LEARN_CATALOG_URL = 'https://learn.microsoft.com/api/catalog/';
const ALLOWED_TYPES = ['modules', 'learningPaths', 'courses', 'certifications', 'appliedSkills'];
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-microsoft-catalog-cache');
const MICROSOFT_DETAIL_TYPES = ['learningPaths', 'modules', 'courses', 'certifications', 'appliedSkills'];

export function resolveMicrosoftTypes(requestedType = 'learningPaths') {
  const selectedTypes =
    requestedType === 'all'
      ? ['learningPaths', 'modules', 'courses']
      : requestedType
          .split(',')
          .map((value) => value.trim())
          .filter((value) => ALLOWED_TYPES.includes(value));

  return selectedTypes.length ? selectedTypes : ['learningPaths'];
}

export async function fetchMicrosoftCatalogSnapshot({ locale = 'en-us', requestedType = 'learningPaths' } = {}) {
  const effectiveTypes = resolveMicrosoftTypes(requestedType);
  const upstreamUrl = new URL(MICROSOFT_LEARN_CATALOG_URL);
  upstreamUrl.searchParams.set('locale', locale);
  upstreamUrl.searchParams.set('type', effectiveTypes.join(','));

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Tutorlix Microsoft Catalog Snapshot/1.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Microsoft catalog snapshot fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  const items = sortCatalogItems(normalizeCatalogItems(data, effectiveTypes));

  return {
    items,
    effectiveTypes,
    source: upstreamUrl.toString(),
    cachedAt: new Date().toISOString(),
  };
}

export async function fetchMicrosoftCatalogItemByUid(uid, { locale = 'en-us' } = {}) {
  const normalizedUid = String(uid || '').trim();

  if (!normalizedUid) {
    return null;
  }

  const upstreamUrl = new URL(MICROSOFT_LEARN_CATALOG_URL);
  upstreamUrl.searchParams.set('locale', locale);
  upstreamUrl.searchParams.set('type', MICROSOFT_DETAIL_TYPES.join(','));
  upstreamUrl.searchParams.set('uid', normalizedUid);

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Tutorlix Microsoft Catalog Detail/1.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Microsoft catalog detail fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  const items = sortCatalogItems(normalizeCatalogItems(data, MICROSOFT_DETAIL_TYPES));
  return items[0] || null;
}

export function filterMicrosoftSnapshotItems(items, q = '', level = '') {
  return filterCatalogItems(items, q.trim().toLowerCase(), level.trim().toLowerCase());
}

export function buildMicrosoftCacheKey(locale = 'en-us', effectiveTypes = ['learningPaths']) {
  return `${locale}::${effectiveTypes.join(',')}`;
}

function cacheFilePath(cacheKey) {
  return path.join(CACHE_DIR, `${encodeURIComponent(cacheKey)}.json`);
}

export async function readMicrosoftCatalogSnapshotCache(cacheKey) {
  try {
    const raw = await readFile(cacheFilePath(cacheKey), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function buildMicrosoftCatalogSource(locale = 'en-us', effectiveTypes = ['learningPaths']) {
  return `https://learn.microsoft.com/api/catalog/?locale=${locale}&type=${effectiveTypes.join(',')}`;
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function extractMetaTag(html, attr, key) {
  const pattern = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const reversePattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const match = html.match(pattern) || html.match(reversePattern);
  return match ? decodeHtmlEntities(match[1]) : '';
}

function extractTitleTag(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s*\|\s*Microsoft Learn.*$/i, '').trim()) : '';
}

function extractHeadingText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function extractListAfterHeading(html, headingText) {
  const headingPattern = new RegExp(
    `<h[2-4][^>]*>\\s*${headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/h[2-4]>([\\s\\S]*?)(?:<h[2-4][^>]*>|<section[^>]*data-title=|<footer|<\\/main>)`,
    'i'
  );
  const sectionMatch = html.match(headingPattern);

  if (!sectionMatch) {
    return [];
  }

  return Array.from(sectionMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
    .slice(0, 10);
}

function extractTextByLabel(html, label) {
  const pattern = new RegExp(`${label}\\s*<\\/[^>]+>\\s*<[^>]+>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  const match = html.match(pattern);
  return match ? stripHtml(match[1]) : '';
}

function inferTypeLabelFromUrl(url = '') {
  if (url.includes('/training/modules/')) return 'Module';
  if (url.includes('/training/paths/')) return 'Learning Path';
  if (url.includes('/training/courses/')) return 'Instructor-Led Course';
  if (url.includes('/credentials/certifications/')) return 'Certification';
  if (url.includes('/credentials/applied-skills/')) return 'Applied Skill';
  return 'Microsoft Learn';
}

function normalizeMicrosoftLearnUrl(target, locale = 'en-us') {
  const raw = String(target || '').trim();

  if (!raw) {
    return '';
  }

  if (isMicrosoftLearnUrl(raw)) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `https://learn.microsoft.com/${locale}${raw.startsWith(`/${locale}/`) ? raw.slice(locale.length + 1) : raw}`;
  }

  return '';
}

export async function scrapeMicrosoftLearnPage(target, { locale = 'en-us' } = {}) {
  const pageUrl = normalizeMicrosoftLearnUrl(target, locale);

  if (!pageUrl) {
    return null;
  }

  const response = await fetch(pageUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Tutorlix Microsoft Learn Scraper/1.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Microsoft Learn page fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const title =
    extractMetaTag(html, 'property', 'og:title') ||
    extractMetaTag(html, 'name', 'title') ||
    extractHeadingText(html, 'h1') ||
    extractTitleTag(html) ||
    'Microsoft Learn';
  const summary =
    extractMetaTag(html, 'name', 'description') ||
    extractMetaTag(html, 'property', 'og:description') ||
    '';
  const socialImageUrl =
    extractMetaTag(html, 'property', 'og:image') ||
    extractMetaTag(html, 'name', 'twitter:image') ||
    '';
  const breadcrumbType = extractTextByLabel(html, 'Type');
  const durationLabel = extractTextByLabel(html, 'Duration');
  const levelLabel = extractTextByLabel(html, 'Level');
  const roleLabel = extractTextByLabel(html, 'Role');
  const productLabel = extractTextByLabel(html, 'Product');
  const subjectLabel = extractTextByLabel(html, 'Subject');

  return {
    uid: '',
    slug: pageUrl,
    title,
    summary,
    subtitle: '',
    url: pageUrl,
    icon_url: '',
    social_image_url: socialImageUrl,
    duration_in_minutes: 0,
    levels: levelLabel ? [levelLabel] : [],
    roles: roleLabel ? roleLabel.split(/\s{2,}|,\s*/).filter(Boolean) : [],
    products: productLabel ? productLabel.split(/\s{2,}|,\s*/).filter(Boolean) : [],
    subjects: subjectLabel ? subjectLabel.split(/\s{2,}|,\s*/).filter(Boolean) : [],
    type: '',
    typeLabel: breadcrumbType || inferTypeLabelFromUrl(pageUrl),
    locale,
    learningObjectives: extractListAfterHeading(html, 'Learning objectives'),
    prerequisites: extractListAfterHeading(html, 'Prerequisites'),
    scraped: true,
    scrapedDurationLabel: durationLabel,
    source: pageUrl,
  };
}

export async function resolveMicrosoftCourseDetail(slugOrUid, { locale = 'en-us' } = {}) {
  const normalizedValue = String(slugOrUid || '').trim();

  if (!normalizedValue) {
    return { course: null, stale: false, source: '', warning: '' };
  }

  try {
    const directItem = isMicrosoftLearnUrl(normalizedValue)
      ? await scrapeMicrosoftLearnPage(normalizedValue, { locale })
      : await fetchMicrosoftCatalogItemByUid(normalizedValue, { locale });

    if (directItem) {
      return {
        course: directItem,
        stale: false,
        source: directItem.url || buildMicrosoftCatalogSource(locale, MICROSOFT_DETAIL_TYPES),
        warning: '',
      };
    }
  } catch {
    // Fall through to cache and scraping fallback.
  }

  const cacheKey = buildMicrosoftCacheKey(locale, resolveMicrosoftTypes('all'));
  const cachedSnapshot = await readMicrosoftCatalogSnapshotCache(cacheKey);
  const cachedCourse = cachedSnapshot ? findMicrosoftCourseBySlug(cachedSnapshot.items || [], normalizedValue) : null;

  if (cachedCourse?.url) {
    try {
      const scrapedCourse = await scrapeMicrosoftLearnPage(cachedCourse.url, { locale });
      if (scrapedCourse) {
        return {
          course: {
            ...cachedCourse,
            ...scrapedCourse,
            uid: cachedCourse.uid || scrapedCourse.uid,
            slug: cachedCourse.slug || scrapedCourse.slug,
          },
          stale: true,
          source: cachedCourse.url,
          warning: 'Showing details scraped from Microsoft Learn because the catalog API did not return this item.',
        };
      }
    } catch {
      return {
        course: cachedCourse,
        stale: true,
        source: cachedCourse.url,
        warning: 'Showing cached Microsoft catalog details because the live catalog API is unavailable.',
      };
    }
  }

  if (isMicrosoftLearnUrl(normalizedValue)) {
    try {
      const scrapedCourse = await scrapeMicrosoftLearnPage(normalizedValue, { locale });
      if (scrapedCourse) {
        return {
          course: scrapedCourse,
          stale: true,
          source: normalizedValue,
          warning: 'Showing details scraped from Microsoft Learn because the catalog API is unavailable.',
        };
      }
    } catch {
      // Fall through to null result.
    }
  }

  return {
    course: cachedCourse || null,
    stale: !!cachedCourse,
    source: cachedCourse?.url || '',
    warning: cachedCourse
      ? 'Showing cached Microsoft catalog details because the live catalog API is unavailable.'
      : '',
  };
}
