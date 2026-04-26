import { NextResponse } from 'next/server';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildPayloadFromFilteredItems,
  filterCatalogItems,
  normalizeCatalogItems,
  sortCatalogItems,
} from '@/lib/microsoftCatalog';

export const runtime = 'nodejs';

const MICROSOFT_LEARN_CATALOG_URL = 'https://learn.microsoft.com/api/catalog/';
const ALLOWED_TYPES = ['modules', 'learningPaths', 'courses', 'certifications', 'appliedSkills'];
const catalogCache = new Map();
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-microsoft-catalog-cache');

function buildCacheKey(locale, effectiveTypes) {
  return `${locale}::${effectiveTypes.join(',')}`;
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

  const selectedTypes =
    requestedType === 'all'
      ? ['learningPaths', 'modules', 'courses']
      : requestedType
          .split(',')
          .map((value) => value.trim())
          .filter((value) => ALLOWED_TYPES.includes(value));

  const effectiveTypes = selectedTypes.length ? selectedTypes : ['learningPaths'];
  const cacheKey = buildCacheKey(locale, effectiveTypes);

  const upstreamUrl = new URL(MICROSOFT_LEARN_CATALOG_URL);
  upstreamUrl.searchParams.set('locale', locale);
  upstreamUrl.searchParams.set('type', effectiveTypes.join(','));

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Tutorlix Microsoft Catalog Proxy/1.0',
      },
      cache: 'no-store',
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
    const normalizedItems = sortCatalogItems(normalizeCatalogItems(data, effectiveTypes));
    const cachedAt = new Date().toISOString();

    catalogCache.set(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: upstreamUrl.toString(),
    });
    await writeCacheSnapshot(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: upstreamUrl.toString(),
    });

    const filteredItems = filterCatalogItems(normalizedItems, q, level);
    return NextResponse.json(buildPayloadFromFilteredItems(
      filteredItems,
      page,
      pageSize,
      effectiveTypes,
      upstreamUrl.toString(),
      false,
      cachedAt
    ));
  } catch (error) {
    const memoryCache = catalogCache.get(cacheKey);
    const fileCache = memoryCache?.items?.length ? null : await readCacheSnapshot(cacheKey);
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
        refreshSource: upstreamUrl.toString(),
      });
    }

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
