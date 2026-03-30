import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * POST /api/quiz/[quizId]/generate-feedback – trigger feedback generation (proxy)
 * Note: [quizId] is used as dynamic segment for compatibility; it maps to attempt_id on backend.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    const response = await fetch(`${resolveBackendBaseUrl()}/api/quiz/${quizId}/generate-feedback`, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
    });

    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { detail: raw };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[/api/quiz/[quizId]/generate-feedback POST] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
