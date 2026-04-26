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
  scrapeMicrosoftCatalogFallback,
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
    const snapshot = await fetchMicrosoftCatalogSnapshot({ locale, requestedType });
    const normalizedItems = snapshot.items;
    const cachedAt = snapshot.cachedAt;
    const snapshotSource = snapshot.source;

    catalogCache.set(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: snapshotSource,
      scraped: false,
    });
    await writeCacheSnapshot(cacheKey, {
      items: normalizedItems,
      cachedAt,
      source: snapshotSource,
      scraped: false,
    });

    const filteredItems = filterCatalogItems(normalizedItems, q, level);
    return NextResponse.json(
      buildPayloadFromFilteredItems(
        filteredItems,
        page,
        pageSize,
        effectiveTypes,
        snapshotSource,
        false,
        cachedAt
      )
    );
  } catch (apiError) {
    const memoryCache = catalogCache.get(cacheKey);
    const fileCache = memoryCache?.items?.length
      ? null
      : ((await readCacheSnapshot(cacheKey)) || (await readMicrosoftCatalogSnapshotCache(cacheKey)));
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
        cachedAt: cachedEntry.cachedAt || null,
        warning: cachedEntry.scraped
          ? 'Serving scraped Microsoft Learn data because the catalog API is unavailable.'
          : 'Serving cached Microsoft Learn catalog data because the upstream service is unavailable.',
        refreshError: apiError instanceof Error ? apiError.message : 'Unknown fetch error',
        refreshSource: source,
      });
    }

    try {
      const scrapedSnapshot = await scrapeMicrosoftCatalogFallback({
        locale,
        requestedType,
        query: q,
      });

      const scrapedItems = filterCatalogItems(scrapedSnapshot.items, q, level);
      const shouldPersistScrapedSnapshot = !q && !level;

      if (shouldPersistScrapedSnapshot) {
        catalogCache.set(cacheKey, {
          items: scrapedSnapshot.items,
          cachedAt: scrapedSnapshot.cachedAt,
          source: scrapedSnapshot.source,
          scraped: true,
        });
        await writeCacheSnapshot(cacheKey, {
          items: scrapedSnapshot.items,
          cachedAt: scrapedSnapshot.cachedAt,
          source: scrapedSnapshot.source,
          scraped: true,
        });
      }

      return NextResponse.json({
        ...buildPayloadFromFilteredItems(
          scrapedItems,
          page,
          pageSize,
          effectiveTypes,
          scrapedSnapshot.source,
          true,
          scrapedSnapshot.cachedAt
        ),
        cachedAt: scrapedSnapshot.cachedAt,
        warning: 'Showing scraped Microsoft Learn data because the catalog API is unavailable.',
        refreshError: apiError instanceof Error ? apiError.message : 'Unknown fetch error',
        refreshSource: source,
      });
    } catch (scrapeError) {
      return NextResponse.json(
        {
          error: 'Microsoft Learn catalog is currently unavailable.',
          details: apiError instanceof Error ? apiError.message : 'Unknown fetch error',
          scrapeDetails: scrapeError instanceof Error ? scrapeError.message : 'Unknown scrape error',
          source,
        },
        { status: 500 }
      );
    }
  }
}
