import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Proxy API requests to the backend
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = request.nextUrl.clone();
    url.host = new URL(apiUrl).host;
    url.port = new URL(apiUrl).port;
    url.protocol = new URL(apiUrl).protocol;
    
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
