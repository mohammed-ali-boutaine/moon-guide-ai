import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * POST /api/career/predict – proxy career prediction to backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(`${resolveBackendBaseUrl()}/api/career/predict`, {
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
    console.error('[/api/career/predict POST] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
