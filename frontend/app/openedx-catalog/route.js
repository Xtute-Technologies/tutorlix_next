import { NextResponse } from 'next/server';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  buildPagedPayload,
  filterOpenEdxCourses,
  normalizeOpenEdxCourses,
  sortOpenEdxCourses,
} from '@/lib/openEdxCatalog';

export const runtime = 'nodejs';

const OPENEDX_API_BASE = process.env.OPENEDX_API_BASE || 'https://api.edx.org';
const OPENEDX_TOKEN_URL = process.env.OPENEDX_TOKEN_URL || `${OPENEDX_API_BASE}/oauth2/v1/access_token`;
const OPENEDX_CLIENT_ID = process.env.OPENEDX_CLIENT_ID || '';
const OPENEDX_CLIENT_SECRET = process.env.OPENEDX_CLIENT_SECRET || '';
const OPENEDX_CATALOG_ID = process.env.OPENEDX_CATALOG_ID || '';
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-openedx-catalog-cache');

let accessTokenCache = {
  token: '',
  expiresAt: 0,
};
let lastResolvedCatalogKey = '';

const catalogCache = new Map();

function cacheFilePath(key) {
  return path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
}

async function writeCacheSnapshot(key, payload) {
  await mkdir(CACHE_DIR, { recursive: true });
  const targetFile = cacheFilePath(key);
  const tempFile = `${targetFile}.tmp`;
  await writeFile(tempFile, JSON.stringify(payload), 'utf8');
  await rename(tempFile, targetFile);
}

async function readCacheSnapshot(key) {
  try {
    const raw = await readFile(cacheFilePath(key), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCacheKey(catalogId) {
  return `catalog::${catalogId || 'default'}`;
}

async function fetchAccessToken() {
  const now = Date.now();
  if (accessTokenCache.token && accessTokenCache.expiresAt > now + 30000) {
    return accessTokenCache.token;
  }

  if (!OPENEDX_CLIENT_ID || !OPENEDX_CLIENT_SECRET) {
    throw new Error('OPENEDX_CLIENT_ID and OPENEDX_CLIENT_SECRET must be configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: OPENEDX_CLIENT_ID,
    client_secret: OPENEDX_CLIENT_SECRET,
    token_type: 'jwt',
  });

  const response = await fetch(OPENEDX_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Tutorlix OpenEdX Catalog Proxy/1.0',
    },
    body: body.toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Open edX token fetch failed: ${response.status} ${response.statusText} ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const expiresIn = Number(data.expires_in || 180);
  accessTokenCache = {
    token: data.access_token || '',
    expiresAt: now + expiresIn * 1000,
  };

  if (!accessTokenCache.token) {
    throw new Error('Open edX token response did not include access_token.');
  }

  return accessTokenCache.token;
}

async function fetchCatalogs(token) {
  const response = await fetch(`${OPENEDX_API_BASE}/catalog/v1/catalogs/`, {
    headers: {
      Accept: 'application/json',
      Authorization: `JWT ${token}`,
      'User-Agent': 'Tutorlix OpenEdX Catalog Proxy/1.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Open edX catalogs fetch failed: ${response.status} ${response.statusText} ${errorText.slice(0, 300)}`);
  }

  return response.json();
}

async function fetchCatalogCourses(token, catalogId) {
  const headers = {
    Accept: 'application/json',
    Authorization: `JWT ${token}`,
    'User-Agent': 'Tutorlix OpenEdX Catalog Proxy/1.0',
  };

  const items = [];
  let nextUrl = `${OPENEDX_API_BASE}/catalog/v1/catalogs/${catalogId}/courses/`;
  let pageCount = 0;

  while (nextUrl) {
    pageCount += 1;
    if (pageCount > 50) {
      throw new Error('Open edX catalog pagination exceeded the safety limit of 50 pages.');
    }

    const response = await fetch(nextUrl, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Open edX catalog courses fetch failed: ${response.status} ${response.statusText} ${errorText.slice(0, 300)}`);
    }

    const data = await response.json();
    items.push(...(Array.isArray(data?.results) ? data.results : []));
    nextUrl = data?.next || null;
  }

  return { results: items };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const level = (searchParams.get('level') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(24, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '12', 10) || 12));

  try {
    const token = await fetchAccessToken();
    const catalogsData = await fetchCatalogs(token);
    const catalogs = Array.isArray(catalogsData?.results) ? catalogsData.results : [];
    const selectedCatalog =
      (OPENEDX_CATALOG_ID ? catalogs.find((item) => String(item.id) === String(OPENEDX_CATALOG_ID)) : null) ||
      catalogs[0] ||
      null;

    if (!selectedCatalog?.id) {
      throw new Error('No Open edX catalog is available for the configured credentials.');
    }

    const cacheKey = getCacheKey(selectedCatalog.id);
    lastResolvedCatalogKey = cacheKey;
    const coursesData = await fetchCatalogCourses(token, selectedCatalog.id);
    const normalizedCourses = sortOpenEdxCourses(normalizeOpenEdxCourses(Array.isArray(coursesData?.results) ? coursesData.results : []));
    const filteredCourses = filterOpenEdxCourses(normalizedCourses, q, level);
    const cachedAt = new Date().toISOString();
    const source = `${OPENEDX_API_BASE}/catalog/v1/catalogs/${selectedCatalog.id}/courses/`;
    const catalogMeta = {
      id: selectedCatalog.id,
      name: selectedCatalog.name || 'Open edX Catalog',
      coursesCount: selectedCatalog.courses_count || normalizedCourses.length,
    };

    catalogCache.set(cacheKey, {
      items: normalizedCourses,
      cachedAt,
      source,
      catalog: catalogMeta,
    });
    await writeCacheSnapshot(cacheKey, {
      items: normalizedCourses,
      cachedAt,
      source,
      catalog: catalogMeta,
    });

    return NextResponse.json(
      buildPagedPayload(filteredCourses, page, pageSize, source, false, cachedAt, catalogMeta)
    );
  } catch (error) {
    const fallbackKey = lastResolvedCatalogKey || getCacheKey(OPENEDX_CATALOG_ID || 'default');
    const memoryCache = catalogCache.get(fallbackKey);
    const fileCache = memoryCache?.items?.length ? null : await readCacheSnapshot(fallbackKey);
    const cachedEntry = memoryCache?.items?.length ? memoryCache : fileCache;

    if (cachedEntry?.items?.length) {
      const filteredCourses = filterOpenEdxCourses(cachedEntry.items, q, level);
      return NextResponse.json({
        ...buildPagedPayload(
          filteredCourses,
          page,
          pageSize,
          cachedEntry.source,
          true,
          cachedEntry.cachedAt || null,
          cachedEntry.catalog || null
        ),
        warning: 'Serving cached Open edX catalog data because the upstream service is unavailable.',
        refreshError: error instanceof Error ? error.message : 'Unknown Open edX fetch error',
      });
    }

    return NextResponse.json(
      {
        error: 'Open edX catalog is currently unavailable.',
        details: error instanceof Error ? error.message : 'Unknown Open edX fetch error',
        source: `${OPENEDX_API_BASE}/catalog/v1/catalogs/`,
      },
      { status: 500 }
    );
  }
}
