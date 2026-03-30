import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendBaseUrl } from '@/lib/server-backend-url';

/**
 * API proxy: POST /api/upload/personal
 * Proxies personal document uploads to backend while maintaining auth cookies.
 * This ensures same-origin requests so SameSite=lax cookies are sent properly.
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl = resolveBackendBaseUrl();

    // Forward the raw body bytes and original Content-Type (with multipart boundary).
    const body = await request.arrayBuffer();
    const contentType = request.headers.get('content-type') || '';

    // Forward request to backend with cookies from the incoming request
    const response = await fetch(`${backendUrl}/api/documents/personal`, {
      method: 'POST',
      headers: {
        // Forward the Cookie header from the client request
        Cookie: request.headers.get('cookie') || '',
        'Content-Type': contentType,
      },
      body: new Uint8Array(body),
    });

    const raw = await response.text();
    let data: unknown = { detail: raw || 'Unexpected server response' };
    try {
      data = raw ? JSON.parse(raw) : data;
    } catch {
      // Keep raw text fallback for non-JSON backend errors.
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { detail: 'Upload failed on server' },
      { status: 500 }
    );
  }
}
