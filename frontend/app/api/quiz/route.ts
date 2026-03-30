import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * GET /api/quiz  – list teacher quizzes (proxy)
 * POST /api/quiz – create quiz manually (proxy)
 *
 * Proxying through Next.js avoids cross-origin CORS issues and ensures
 * the httpOnly auth cookie is forwarded from the browser to the backend.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${resolveBackendBaseUrl()}/api/quiz${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
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
    console.error('[/api/quiz GET] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(`${resolveBackendBaseUrl()}/api/quiz`, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      body,
    });

    const raw = await response.text();
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = { detail: raw }; }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[/api/quiz POST] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
