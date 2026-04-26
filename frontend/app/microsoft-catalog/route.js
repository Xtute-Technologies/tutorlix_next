import { NextResponse } from 'next/server';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
const catalogCache = new Map();
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-microsoft-catalog-cache');

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

function buildCacheKey(locale, effectiveTypes) {
  return `${locale}::${effectiveTypes.join(',')}`;
}

function sortCatalogItems(items) {
  return [...items].sort((left, right) => {
    if (right.popularity !== left.popularity) {
      return right.popularity - left.popularity;
    }

    const leftDate = left.last_modified ? new Date(left.last_modified).getTime() : 0;
    const rightDate = right.last_modified ? new Date(right.last_modified).getTime() : 0;
    return rightDate - leftDate;
  });
}

function filterCatalogItems(items, q, level) {
  return items
    .filter((item) => (q ? buildSearchHaystack(item).includes(q) : true))
    .filter((item) => (level ? item.levels.some((itemLevel) => itemLevel.toLowerCase() === level) : true));
}

function buildPayloadFromFilteredItems(items, page, pageSize, effectiveTypes, source, stale = false, cachedAt = null) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    total,
    page: currentPage,
    pageSize,
    totalPages,
    availableLevels: Array.from(new Set(items.flatMap((item) => item.levels))).sort(),
    requestedTypes: effectiveTypes,
    source,
    stale,
    cachedAt,
  };
}

function cacheFilePath(cacheKey) {
  return path.join(CACHE_DIR, `${encodeURIComponent(cacheKey)}.json`);
}

async function writeCacheSnapshot(cacheKey, payload) {
  await mkdir(CACHE_DIR, { recursive: true });
  const targetFile = cacheFilePath(cacheKey);
  const tempFile = `${targetFile}.tmp`;
  await writeFile(tempFile, JSON.stringify(payload), 'utf8');
  await rename(tempFile, targetFile);
}

async function readCacheSnapshot(cacheKey) {
  try {
    const raw = await readFile(cacheFilePath(cacheKey), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en-us';
  const requestedType = searchParams.get('type') || 'learningPaths';
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const level = (searchParams.get('level') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(24, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '12', 10) || 12));

  const effectiveTypes = resolveMicrosoftTypes(requestedType);
  const cacheKey = buildMicrosoftCacheKey(locale, effectiveTypes);
  const source = buildMicrosoftCatalogSource(locale, effectiveTypes);

  try {
    const snapshot = await fetchMicrosoftCatalogSnapshot({
      locale,
      requestedType,
    });
    const normalizedItems = snapshot.items;
    const cachedAt = snapshot.cachedAt;
    const snapshotSource = snapshot.source;

    catalogCache.set(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: snapshotSource,
    });
    await writeCacheSnapshot(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: snapshotSource,
    });

    const filteredItems = filterCatalogItems(normalizedItems, q, level);
    return NextResponse.json(buildPayloadFromFilteredItems(
      filteredItems,
      page,
      pageSize,
      effectiveTypes,
      snapshotSource,
      false,
      cachedAt
    ));
  } catch (error) {
    const memoryCache = catalogCache.get(cacheKey);
    const fileCache = memoryCache?.items?.length ? null : ((await readCacheSnapshot(cacheKey)) || (await readMicrosoftCatalogSnapshotCache(cacheKey)));
    const cachedEntry = memoryCache?.items?.length ? memoryCache : fileCache;

    if (cachedEntry?.items?.length) {
      const filteredItems = filterCatalogItems(cachedEntry.items, q, level);
      return NextResponse.json({
        ...buildPayloadFromFilteredItems(
          filteredItems,
          page,
          pageSize,
          effectiveTypes,
          cachedEntry.source,
          true,
          cachedEntry.cachedAt || null
        ),
        cachedAt: cachedEntry.cachedAt,
        warning: 'Serving cached Microsoft Learn catalog data because the upstream service is unavailable.',
        refreshError: error instanceof Error ? error.message : 'Unknown fetch error',
        refreshSource: source,
      });
    }

    return NextResponse.json(
      {
        error: 'Microsoft Learn catalog is currently unavailable.',
        details: error instanceof Error ? error.message : 'Unknown fetch error',
        source,
      },
      { status: 500 }
    );
  }
}
