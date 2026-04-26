import { buildProfileHomeContent } from '@/app/data/homeContent';
import { getCoursePath } from '@/lib/courseUrls';

export const SITE_URL = 'https://tutorlix.com';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.SITEMAP_API_URL ||
  'http://localhost:8000';

const STATIC_ROUTES = [
  '/',
  '/courses',
  '/categories',
  '/notes',
  '/microsoft-courses',
  '/openedx-courses',
  '/forum',
  '/masterclass',
  '/contact',
  '/question-bank',
  '/privacy',
  '/terms',
  '/shipping',
  '/cancellation',
];

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function toAbsoluteUrl(pathname) {
  if (!pathname) return SITE_URL;
  return new URL(pathname, SITE_URL).toString();
}

function sanitizePath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  if (ABSOLUTE_URL_PATTERN.test(pathname)) {
    try {
      const parsed = new URL(pathname);
      if (parsed.origin !== SITE_URL) return null;
      return `${parsed.pathname}${parsed.search || ''}`.replace(/\/+$/, '') || '/';
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith('/')) return null;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/public-payment/') ||
    pathname.startsWith('/payment-success') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return pathname.replace(/\/+$/, '') || '/';
}

async function fetchJson(pathname, params = {}) {
  const url = new URL(pathname, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()} (${response.status})`);
  }

  return response.json();
}

async function fetchCollection(pathname, params = {}) {
  const data = await fetchJson(pathname, { page_size: 2000, ...params });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeTimestamp(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function pushUrl(map, pathname, lastModified = new Date()) {
  const cleanPath = sanitizePath(pathname);
  if (!cleanPath) return;

  const absolute = toAbsoluteUrl(cleanPath);
  const nextDate = normalizeTimestamp(lastModified);
  const existing = map.get(absolute);

  if (!existing || nextDate > existing.lastModified) {
    map.set(absolute, {
      url: absolute,
      lastModified: nextDate,
    });
  }
}

function getNavigationUrls(homeContent) {
  const urls = [];
  const navigation = homeContent?.navigation || {};

  if (Array.isArray(navigation.links)) {
    navigation.links.forEach((item) => {
      if (item?.visibility === 'public' || item?.visibility === undefined) {
        urls.push(item?.url);
      }
    });
  }

  if (Array.isArray(navigation.subnav_groups)) {
    navigation.subnav_groups.forEach((group) => {
      if (Array.isArray(group?.items)) {
        group.items.forEach((item) => urls.push(item?.url));
      }
    });
  }

  urls.push(navigation.question_banks_url);
  return urls;
}

function getTutorialUrls(homeContent) {
  const urls = [];
  const tutorials = Array.isArray(homeContent?.tutorials) ? homeContent.tutorials : [];

  tutorials.forEach((tutorial) => {
    if (!tutorial?.slug) return;

    urls.push(`/tutorial/${tutorial.slug}`);

    const pages = Array.isArray(tutorial.pages) ? tutorial.pages : [tutorial];
    pages.forEach((page) => {
      if (page?.slug) {
        urls.push(`/tutorial/${tutorial.slug}/${page.slug}`);
      }

      const concepts = Array.isArray(page?.conceptsCovered) ? page.conceptsCovered : [];
      concepts.forEach((concept) => {
        if (concept?.slug) {
          urls.push(`/notes/tutorials/${tutorial.slug}/${concept.slug}`);
        }
        urls.push(concept?.noteUrl);
      });
    });
  });

  return urls;
}

export async function getSitemapEntries() {
  const entries = new Map();

  STATIC_ROUTES.forEach((route) => pushUrl(entries, route));

  const [categories, products, notes, profileTypes, questionBankCourses, masterclasses] =
    await Promise.allSettled([
      fetchCollection('/api/lms/categories/'),
      fetchCollection('/api/lms/products/'),
      fetchCollection('/api/notes/public/browse/'),
      fetchCollection('/api/lms/profile-types/'),
      fetchCollection('/api/lms/question-bank-courses/'),
      fetchCollection('/api/lms/masterclasses/', { is_active: true }),
    ]);

  if (categories.status === 'fulfilled') {
    categories.value.forEach((category) => {
      pushUrl(entries, `/categories/${category.id}`, category.updated_at || category.created_at);
    });
  }

  if (products.status === 'fulfilled') {
    products.value.forEach((product) => {
      pushUrl(entries, getCoursePath(product), product.updated_at || product.created_at);
    });
  }

  if (notes.status === 'fulfilled') {
    notes.value.forEach((note) => {
      if (note?.slug) {
        pushUrl(entries, `/notes/${note.slug}`, note.updated_at || note.created_at);
      }
    });
  }

  if (questionBankCourses.status === 'fulfilled') {
    const questionBankCourseDetails = await Promise.allSettled(
      questionBankCourses.value
        .filter((course) => course?.slug)
        .map((course) => fetchJson(`/api/lms/question-bank-courses/${course.slug}/`))
    );

    questionBankCourses.value.forEach((course) => {
      if (!course?.slug) return;
      pushUrl(entries, `/question-bank/${course.slug}`, course.updated_at || course.created_at);
    });

    questionBankCourseDetails.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const course = result.value;
      const topics = Array.isArray(course?.topics) ? course.topics : [];
      topics.forEach((topic) => {
        if (course?.slug && topic?.slug) {
          pushUrl(
            entries,
            `/question-bank/${course.slug}/${topic.slug}`,
            topic.updated_at || topic.created_at || course.updated_at || course.created_at
          );
        }
      });
    });
  }

  if (masterclasses.status === 'fulfilled' && masterclasses.value.length > 0) {
    pushUrl(entries, '/masterclass', new Date());
  }

  if (profileTypes.status === 'fulfilled') {
    profileTypes.value.forEach((profileType) => {
      const homeContent = buildProfileHomeContent(profileType.slug, profileType.home_content);
      const derivedUrls = [
        ...getNavigationUrls(homeContent),
        ...getTutorialUrls(homeContent),
      ];

      derivedUrls.forEach((url) => pushUrl(entries, url, profileType.updated_at || profileType.created_at));
    });
  }

  return Array.from(entries.values()).sort((a, b) => a.url.localeCompare(b.url));
}
