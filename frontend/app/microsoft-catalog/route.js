import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MICROSOFT_LEARN_CATALOG_URL = 'https://learn.microsoft.com/api/catalog/';
const ALLOWED_TYPES = ['modules', 'learningPaths', 'courses', 'certifications', 'appliedSkills'];

const TYPE_LABELS = {
  modules: 'Module',
  learningPaths: 'Learning Path',
  courses: 'Instructor-Led Course',
  certifications: 'Certification',
  appliedSkills: 'Applied Skill',
};

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function buildSearchHaystack(item) {
  return [
    item.title,
    item.summary,
    item.subtitle,
    item.display_name,
    ...normalizeArray(item.roles),
    ...normalizeArray(item.levels),
    ...normalizeArray(item.products),
    ...normalizeArray(item.subjects),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeCatalogItems(data, selectedTypes) {
  return selectedTypes.flatMap((typeKey) => {
    const records = Array.isArray(data?.[typeKey]) ? data[typeKey] : [];

    return records.map((item) => ({
      uid: item.uid,
      title: item.title || item.display_name || 'Untitled Microsoft Learn item',
      summary: item.summary || item.subtitle || '',
      url: item.url || '',
      icon_url: item.icon_url || item.social_image_url || '',
      duration_in_minutes: item.duration_in_minutes || 0,
      levels: normalizeArray(item.levels),
      roles: normalizeArray(item.roles),
      products: normalizeArray(item.products),
      subjects: normalizeArray(item.subjects),
      last_modified: item.last_modified || null,
      type: typeKey,
      typeLabel: TYPE_LABELS[typeKey] || typeKey,
      popularity: typeof item.popularity === 'number' ? item.popularity : 0,
      locale: item.locale || 'en-us',
    }));
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en-us';
  const requestedType = searchParams.get('type') || 'learningPaths';
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const level = (searchParams.get('level') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(24, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '12', 10) || 12));

  const selectedTypes =
    requestedType === 'all'
      ? ['learningPaths', 'modules', 'courses']
      : requestedType
          .split(',')
          .map((value) => value.trim())
          .filter((value) => ALLOWED_TYPES.includes(value));

  const effectiveTypes = selectedTypes.length ? selectedTypes : ['learningPaths'];

  const upstreamUrl = new URL(MICROSOFT_LEARN_CATALOG_URL);
  upstreamUrl.searchParams.set('locale', locale);
  upstreamUrl.searchParams.set('type', effectiveTypes.join(','));

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Tutorlix Microsoft Catalog Proxy/1.0',
      },
      next: { revalidate: 60 * 60 * 12 },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to fetch Microsoft Learn catalog.',
          upstreamStatus: response.status,
          upstreamStatusText: response.statusText,
          upstreamBody: errorText.slice(0, 500),
          source: upstreamUrl.toString(),
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const normalizedItems = normalizeCatalogItems(data, effectiveTypes);

    const filteredItems = normalizedItems
      .filter((item) => (q ? buildSearchHaystack(item).includes(q) : true))
      .filter((item) => (level ? item.levels.some((itemLevel) => itemLevel.toLowerCase() === level) : true))
      .sort((left, right) => {
        if (right.popularity !== left.popularity) {
          return right.popularity - left.popularity;
        }

        const leftDate = left.last_modified ? new Date(left.last_modified).getTime() : 0;
        const rightDate = right.last_modified ? new Date(right.last_modified).getTime() : 0;
        return rightDate - leftDate;
      });

    const total = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const items = filteredItems.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      items,
      total,
      page: currentPage,
      pageSize,
      totalPages,
      availableLevels: Array.from(new Set(filteredItems.flatMap((item) => item.levels))).sort(),
      requestedTypes: effectiveTypes,
      source: upstreamUrl.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Microsoft Learn catalog is currently unavailable.',
        details: error instanceof Error ? error.message : 'Unknown fetch error',
        source: upstreamUrl.toString(),
      },
      { status: 500 }
    );
  }
}
