import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  filterCatalogItems,
  normalizeCatalogItems,
  sortCatalogItems,
} from '@/lib/microsoftCatalog';

const MICROSOFT_LEARN_CATALOG_URL = 'https://learn.microsoft.com/api/catalog/';
const ALLOWED_TYPES = ['modules', 'learningPaths', 'courses', 'certifications', 'appliedSkills'];
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-microsoft-catalog-cache');

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
