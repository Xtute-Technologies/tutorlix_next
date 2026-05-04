// app/api/jobs/route.js

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const response = await fetch(
        `https://himalayas.app/jobs/api/search?${searchParams.toString()}`,
        {
            headers: {
                Accept: 'application/json',
            },
            next: { revalidate: 300 },
        }
    );

    if (!response.ok) {
        return Response.json(
            { error: 'Failed to fetch jobs' },
            { status: response.status }
        );
    }

    const data = await response.json();
    return Response.json(data);
}