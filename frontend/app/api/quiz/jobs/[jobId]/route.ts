import { NextRequest, NextResponse } from 'next/server';

const backendUrl = () => process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * GET /api/quiz/jobs/[jobId] – poll quiz generation job status (proxy)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const response = await fetch(`${backendUrl()}/api/quiz/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
    });

    const raw = await response.text();
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = { detail: raw }; }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[/api/quiz/jobs/[jobId] GET] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
