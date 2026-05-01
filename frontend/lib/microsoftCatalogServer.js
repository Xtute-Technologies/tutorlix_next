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
const DEFAULT_BACKEND_API_BASE = 'http://localhost:8000';
const MICROSOFT_CATALOG_SYNC_BATCH_SIZE = 250;

function resolveBackendApiBase(origin = '') {
  const configuredBase =
    process.env.MICROSOFT_CATALOG_BACKEND_URL ||
    process.env.SITEMAP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND_API_BASE;

  if (/^https?:\/\//i.test(configuredBase)) {
    return configuredBase.replace(/\/+$/, '');
  }

  if (origin && /^https?:\/\//i.test(origin)) {
    return new URL(configuredBase, origin).toString().replace(/\/+$/, '');
  }

  return DEFAULT_BACKEND_API_BASE;
}

function buildBackendApiUrl(pathname, params = {}, origin = '') {
  const url = new URL(pathname, `${resolveBackendApiBase(origin)}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

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

export async function fetchStoredMicrosoftCatalogSnapshot({
  locale = 'en-us',
  requestedType = 'learningPaths',
  q = '',
  level = '',
  page = 1,
  pageSize = 12,
  origin = '',
} = {}) {
  const effectiveTypes = resolveMicrosoftTypes(requestedType);
  const storedCatalogUrl = buildBackendApiUrl('/api/lms/microsoft-courses/', {
    locale,
    type: requestedType,
    q,
    level,
    page,
    pageSize,
  }, origin);

  try {
    const response = await fetch(storedCatalogUrl, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Number.isFinite(Number(data?.storedCount)) || Number(data.storedCount) <= 0) {
      return null;
    }

    return {
      ...data,
      effectiveTypes,
      source: data.source || 'tutorlix-database:microsoft-courses',
      stale: true,
      stored: true,
      cachedAt: data.cachedAt || null,
    };
  } catch {
    return null;
  }
}

export async function persistMicrosoftCatalogSnapshot({
  items = [],
  locale = 'en-us',
  source = '',
  cachedAt = null,
  scraped = false,
  origin = '',
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const syncUrl = buildBackendApiUrl('/api/lms/microsoft-courses/sync-snapshot/', {}, origin);
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (process.env.MICROSOFT_CATALOG_SYNC_TOKEN) {
    headers['X-Microsoft-Catalog-Sync-Token'] = process.env.MICROSOFT_CATALOG_SYNC_TOKEN;
  }

  const summary = {
    created: 0,
    updated: 0,
    total: 0,
  };

  try {
    for (let index = 0; index < items.length; index += MICROSOFT_CATALOG_SYNC_BATCH_SIZE) {
      const batch = items.slice(index, index + MICROSOFT_CATALOG_SYNC_BATCH_SIZE);
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: batch,
          locale,
          source,
          cachedAt,
          scraped,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return summary.total > 0 ? summary : null;
      }

      const result = await response.json();
      summary.created += Number(result?.created || 0);
      summary.updated += Number(result?.updated || 0);
      summary.total += Number(result?.total || 0);
    }

    return summary;
  } catch {
    return summary.total > 0 ? summary : null;
  }
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

const TRAINING_BROWSE_CONFIG = {
  learningPaths: {
    urlBuilder: (locale, query) =>
      `https://learn.microsoft.com/${locale}/training/browse/?resource_type=learning%20path${query ? `&terms=${encodeURIComponent(query)}` : ''}`,
    pathNeedle: '/training/paths/',
    typeLabel: 'Learning Path',
  },
  modules: {
    urlBuilder: (locale, query) =>
      `https://learn.microsoft.com/${locale}/training/browse/?resource_type=module${query ? `&terms=${encodeURIComponent(query)}` : ''}`,
    pathNeedle: '/training/modules/',
    typeLabel: 'Module',
  },
  courses: {
    urlBuilder: (locale, query) =>
      `https://learn.microsoft.com/${locale}/training/browse/?resource_type=course${query ? `&terms=${encodeURIComponent(query)}` : ''}`,
    pathNeedle: '/training/courses/',
    typeLabel: 'Instructor-Led Course',
  },
  certifications: {
    urlBuilder: (locale, query) =>
      `https://learn.microsoft.com/${locale}/credentials/certifications/${query ? `?terms=${encodeURIComponent(query)}` : ''}`,
    pathNeedle: '/credentials/certifications/',
    typeLabel: 'Certification',
  },
  appliedSkills: {
    urlBuilder: (locale, query) =>
      `https://learn.microsoft.com/${locale}/credentials/applied-skills/${query ? `?terms=${encodeURIComponent(query)}` : ''}`,
    pathNeedle: '/credentials/applied-skills/',
    typeLabel: 'Applied Skill',
  },
};

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

function normalizeRelativeMicrosoftLearnUrl(href, locale = 'en-us') {
  const raw = String(href || '').trim();

  if (!raw) {
    return '';
  }

  if (isMicrosoftLearnUrl(raw)) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `https://learn.microsoft.com${raw.startsWith(`/${locale}/`) ? raw : `/${locale}${raw}`}`;
  }

  return '';
}

function extractLevelBadges(snippet) {
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  return levels.filter((level) => new RegExp(`\\b${level}\\b`, 'i').test(snippet));
}

function extractDurationInMinutes(snippet) {
  const hourMatch = snippet.match(/(\d+)\s*(?:hour|hours|hr|hrs)\b/i);
  const minuteMatch = snippet.match(/(\d+)\s*(?:minute|minutes|min)\b/i);
  const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;
  const totalMinutes = (hours * 60) + minutes;
  return Number.isFinite(totalMinutes) ? totalMinutes : 0;
}

function extractSummaryFromSnippet(snippet, title) {
  const paragraphs = Array.from(snippet.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);

  return paragraphs.find((paragraph) => paragraph !== title) || '';
}

function scrapeCatalogItemsFromHtml(html, typeKey, locale = 'en-us') {
  const config = TRAINING_BROWSE_CONFIG[typeKey];

  if (!config) {
    return [];
  }

  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const items = [];
  const seen = new Set();

  for (const match of html.matchAll(anchorPattern)) {
    const href = normalizeRelativeMicrosoftLearnUrl(match[1], locale);

    if (!href || !href.includes(config.pathNeedle) || seen.has(href)) {
      continue;
    }

    const title = stripHtml(match[2]).replace(/\s+/g, ' ').trim();

    if (!title || title.length < 8) {
      continue;
    }

    const snippet = html.slice(match.index, Math.min(html.length, match.index + 1600));
    const summary = extractSummaryFromSnippet(snippet, title);

    items.push({
      uid: href,
      slug: href,
      title,
      summary,
      subtitle: '',
      url: href,
      icon_url: '',
      social_image_url: '',
      duration_in_minutes: extractDurationInMinutes(snippet),
      levels: extractLevelBadges(snippet),
      roles: [],
      products: [],
      subjects: [],
      last_modified: null,
      type: typeKey,
      typeLabel: config.typeLabel,
      popularity: 0,
      locale,
      scraped: true,
    });
    seen.add(href);
  }

  return items;
}

export async function scrapeMicrosoftCatalogFallback({ locale = 'en-us', requestedType = 'learningPaths', query = '' } = {}) {
  const effectiveTypes = resolveMicrosoftTypes(requestedType);
  const scrapeResults = await Promise.all(
    effectiveTypes.map(async (typeKey) => {
      const config = TRAINING_BROWSE_CONFIG[typeKey];

      if (!config) {
        return { items: [], source: '' };
      }

      const source = config.urlBuilder(locale, query);
      const response = await fetch(source, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Tutorlix Microsoft Learn Catalog Scraper/1.0',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Microsoft Learn scrape failed with status ${response.status}`);
      }

      const html = await response.text();
      return {
        items: scrapeCatalogItemsFromHtml(html, typeKey, locale),
        source,
      };
    })
  );

  return {
    items: sortCatalogItems(scrapeResults.flatMap((entry) => entry.items)),
    effectiveTypes,
    source: scrapeResults.map((entry) => entry.source).filter(Boolean).join(', '),
    cachedAt: new Date().toISOString(),
  };
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
