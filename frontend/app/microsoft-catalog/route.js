import { NextResponse } from 'next/server';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildPayloadFromFilteredItems,
  filterCatalogItems,
} from '@/lib/microsoftCatalog';
import {
  buildMicrosoftCacheKey,
  buildMicrosoftCatalogSource,
  fetchMicrosoftCatalogSnapshot,
  readMicrosoftCatalogSnapshotCache,
  resolveMicrosoftTypes,
} from '@/lib/microsoftCatalogServer';

export const runtime = 'nodejs';

const catalogCache = new Map();
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-microsoft-catalog-cache');


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
