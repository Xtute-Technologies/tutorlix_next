import { NextResponse } from 'next/server';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const jobsCache = new Map();
const CACHE_DIR = path.join(tmpdir(), 'tutorlix-jobs-catalog-cache');

function getJobsFromResponse(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.jobs || payload?.data || payload?.results || [];
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

async function readAnyJobsSnapshot() {
  // Check memory cache first
  for (const entry of jobsCache.values()) {
    if (entry?.jobs?.length) return entry;
  }

  // Check file cache
  try {
    const filenames = await readdir(CACHE_DIR);

    for (const filename of filenames) {
      if (!filename.endsWith('.json')) continue;

      try {
        const raw = await readFile(path.join(CACHE_DIR, filename), 'utf8');
        const entry = JSON.parse(raw);

        if (entry?.jobs?.length) return entry;
      } catch {
        // Ignore corrupt files
      }
    }
  } catch {
    // Directory may not exist yet
  }

  return null;
}

function buildJobsCacheKey(searchParams) {
  return searchParams.toString() || 'default';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  const cacheKey = buildJobsCacheKey(searchParams);

  const upstreamUrl = `https://himalayas.app/jobs/api/search?${searchParams.toString()}`;

  try {
    // 🔹 1. Try API
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Tutorlix Jobs Board (https://tutorlix.com)',
      },
      cache: 'no-store',
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Jobs provider returned non-JSON response');
    }

    if (!response.ok) {
      throw new Error(data?.error || `API failed with ${response.status}`);
    }

    const jobs = getJobsFromResponse(data);

    const snapshot = {
      ...data,
      jobs,
      cachedAt: new Date().toISOString(),
      source: 'api',
      stale: false,
    };

    // 🔹 2. Save in memory cache
    jobsCache.set(cacheKey, snapshot);

    // 🔹 3. Save in file cache
    await writeCacheSnapshot(cacheKey, snapshot);

    // 🔹 4. Return fresh data
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (apiError) {
    console.error('API failed → fallback to cache:', apiError);

    // 🔹 5. Try exact cache
    const exactCache =
      jobsCache.get(cacheKey) || (await readCacheSnapshot(cacheKey));

    // 🔹 6. Try any available cache
    const fallback =
      exactCache?.jobs?.length ? exactCache : await readAnyJobsSnapshot();

    if (fallback?.jobs?.length) {
      return NextResponse.json({
        ...fallback,
        stale: true,
        warning: 'Showing cached jobs (API failed)',
        refreshError:
          apiError instanceof Error ? apiError.message : 'Unknown error',
      });
    }

    // 🔹 7. Total failure
    return NextResponse.json(
      {
        error: 'Jobs service unavailable',
        details:
          apiError instanceof Error ? apiError.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}