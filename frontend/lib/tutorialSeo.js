import {
  buildProfileHomeContent,
  findDefaultTutorialPage,
  normalizeTutorialPages,
} from '@/app/data/homeContent';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.SITEMAP_API_URL ||
  'http://localhost:8000';

async function fetchProfileTypes() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/lms/profile-types/`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  } catch {
    return [];
  }
}

function titleFromSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export async function findTutorialSeoEntry(topicSlug, pageSlug = null) {
  const profileTypes = await fetchProfileTypes();

  for (const profileType of profileTypes) {
    const homeContent = buildProfileHomeContent(profileType.slug, profileType.home_content);
    const tutorials = Array.isArray(homeContent?.tutorials) ? homeContent.tutorials : [];
    const tutorial = tutorials.find((item) => item?.slug === topicSlug);

    if (!tutorial) continue;

    const pages = normalizeTutorialPages(tutorial);
    const page =
      (pageSlug ? pages.find((item) => item?.slug === pageSlug) : null) ||
      pages[0] ||
      null;

    return { tutorial, page };
  }

  const fallbackEntry = findDefaultTutorialPage(topicSlug, pageSlug);
  if (fallbackEntry.page || !pageSlug) {
    return fallbackEntry;
  }

  if (!fallbackEntry.tutorial) {
    return {
      tutorial: null,
      page: pageSlug
        ? {
            slug: pageSlug,
            title: titleFromSlug(pageSlug),
            shortDescription: `Explore ${titleFromSlug(pageSlug)} on Tutorlix.`,
          }
        : null,
    };
  }

  return {
    tutorial: fallbackEntry.tutorial,
    page: {
      slug: pageSlug,
      title: titleFromSlug(pageSlug),
      shortDescription: `Explore ${titleFromSlug(pageSlug)} in ${fallbackEntry.tutorial.title} on Tutorlix.`,
    },
  };
}
