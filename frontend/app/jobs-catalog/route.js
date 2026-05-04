// app/jobs-catalog/route.js

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const upstreamUrl = `https://himalayas.app/jobs/api/search?${searchParams.toString()}`;

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
      return Response.json(
        {
          error: 'Jobs provider returned a non-JSON response.',
          status: response.status,
          preview: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return Response.json(
        {
          error: data?.error || 'Failed to fetch jobs from provider.',
          status: response.status,
          data,
        },
        { status: 502 }
      );
    }

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('jobs-catalog error:', error);

    return Response.json(
      {
        error: 'Internal jobs catalog error.',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}