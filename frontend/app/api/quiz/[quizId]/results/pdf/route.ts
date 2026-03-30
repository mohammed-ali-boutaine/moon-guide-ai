import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * GET /api/quiz/[quizId]/results/pdf – export attempt results as PDF (proxy)
 * Note: [quizId] is used as dynamic segment for compatibility; it maps to attempt_id on backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    const response = await fetch(`${resolveBackendBaseUrl()}/api/quiz/${quizId}/results/pdf`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    });

    const buffer = await response.arrayBuffer();
    const headers = new Headers();

    const contentType = response.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);

    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) headers.set('content-disposition', contentDisposition);

    return new NextResponse(buffer, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('[/api/quiz/[quizId]/results/pdf GET] proxy error:', error);
    return NextResponse.json({ detail: 'Failed to reach backend' }, { status: 502 });
  }
}
