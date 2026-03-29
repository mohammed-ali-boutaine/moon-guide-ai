import { NextRequest, NextResponse } from 'next/server';

/**
 * API proxy: POST /api/upload/class/[classId]
 * Proxies document uploads to backend while maintaining auth cookies.
 * This ensures same-origin requests so SameSite=lax cookies are sent properly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;

    // BACKEND_URL env var for flexibility: Docker uses 'http://backend:8000',
    // local dev without Docker falls back to 'http://localhost:8000'
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const targetUrl = `${backendUrl}/api/classes/${classId}/documents`;

    console.log('[upload/class] classId:', classId);
    console.log('[upload/class] target URL:', targetUrl);
    console.log('[upload/class] content-type:', request.headers.get('content-type'));
    console.log('[upload/class] cookie present:', !!request.headers.get('cookie'));

    // Forward the raw body bytes and original Content-Type (with multipart boundary).
    // Parsing FormData then re-serializing it via Node.js fetch is unreliable for
    // binary file uploads — raw passthrough is safer.
    const body = await request.arrayBuffer();
    const contentType = request.headers.get('content-type') || '';

    console.log('[upload/class] body size (bytes):', body.byteLength);

    // Forward request to backend with cookies from the incoming request
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        // Forward the Cookie header from the client request
        Cookie: request.headers.get('cookie') || '',
        'Content-Type': contentType,
      },
      body: new Uint8Array(body),
    });

    console.log('[upload/class] backend response status:', response.status);

    const raw = await response.text();
    console.log('[upload/class] backend response body:', raw);

    let data: unknown = { detail: raw || 'Unexpected server response' };
    try {
      data = raw ? JSON.parse(raw) : data;
    } catch {
      // Keep raw text fallback for non-JSON backend errors.
    }

    if (!response.ok) {
      console.error('[upload/class] backend error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[upload/class] proxy exception:', error);
    return NextResponse.json(
      { detail: 'Upload failed on server' },
      { status: 500 }
    );
  }
}
