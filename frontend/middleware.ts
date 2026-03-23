import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Route definitions ────────────────────────────────────────────────────────

/** Routes that require an authenticated session */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/me',
  '/settings',
  '/career',
  '/quiz',
  '/documents',
];

/** Routes that must NOT be accessible when already logged in */
const AUTH_ONLY_ROUTES = ['/login', '/register'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAuthOnly(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ── JWT helpers (Edge-compatible, no signature verification) ─────────────────

interface JwtPayload {
  sub?: string;
  exp?: number;
  type?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  // Add 10s buffer to account for clock skew
  return payload.exp * 1000 < Date.now() + 10_000;
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Skip /api/upload/ - these are handled by custom route handlers
  if (pathname.startsWith('/api/upload/')) {
    return NextResponse.next();
  }

  // Proxy other /api/ requests to the backend (keep existing behaviour)
  if (pathname.startsWith('/api/')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = request.nextUrl.clone();
    const parsed = new URL(apiUrl);
    url.host = parsed.host;
    url.port = parsed.port;
    url.protocol = parsed.protocol;
    return NextResponse.rewrite(url);
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // ── If already authenticated, redirect away from login/register ──
  if (isAuthOnly(pathname)) {
    if (accessToken && !isTokenExpired(accessToken)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Only enforce auth on protected routes ──
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Fast path: valid, non-expired access token
  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  // Access token missing or expired – attempt silent refresh
  if (refreshToken) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward only the refresh token cookie so the backend can read it
          Cookie: `refresh_token=${refreshToken}`,
        },
      });

      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { access_token: string };
        const response = NextResponse.next();
        // Set the new access_token cookie so the forwarded request has it
        response.cookies.set('access_token', data.access_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60, // 15 min
        });
        return response;
      }
    } catch {
      // Network error – fall through to redirect
    }
  }

  // No valid session – redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
