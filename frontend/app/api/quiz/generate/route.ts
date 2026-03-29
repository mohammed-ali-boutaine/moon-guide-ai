import { NextRequest, NextResponse } from 'next/server';

const backendUrl = () => process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * POST /api/quiz/generate – start async quiz generation job (proxy)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(`${backendUrl()}/api/quiz/generate`, {
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
    console.error('[/api/quiz/generate POST] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
