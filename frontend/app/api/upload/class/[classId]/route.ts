import { NextRequest, NextResponse } from 'next/server';

/**
 * API proxy: POST /api/upload/class/[classId]
 * Proxies document uploads to backend while maintaining auth cookies.
 * This ensures same-origin requests so SameSite=lax cookies are sent properly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const classId = params.classId;
    const formData = await request.formData();

    // BACKEND_URL env var for flexibility: Docker uses 'http://backend:8000',
    // local dev without Docker should set BACKEND_URL=http://localhost:8000
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';

    // Forward request to backend with cookies from the incoming request
    const response = await fetch(
      `${backendUrl}/api/classes/${classId}/documents`,
      {
        method: 'POST',
        headers: {
          // Forward the Cookie header from the client request
          Cookie: request.headers.get('cookie') || '',
        },
        body: formData,
      }
    );

    const data = await response.json();

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
