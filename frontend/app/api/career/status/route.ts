import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * GET /api/career/status – check if career model is available
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${resolveBackendBaseUrl()}/api/career/status`, {
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
    console.error('[/api/career/status GET] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
