/**
 * Base URL for server-side proxies to FastAPI (Route Handlers, middleware).
 * Must be absolute with http: or https: — e.g. http://localhost:8000 locally,
 * http://backend:8000 inside Docker for the frontend container.
 *
 * Invalid values (another env key name, missing scheme, etc.) are skipped so
 * fetch() does not treat them as relative paths and return confusing bodies.
 */
export function resolveBackendBaseUrl(): string {
  const tryOne = (raw: string | undefined): string | null => {
    if (!raw?.trim()) return null;
    const s = raw.trim().replace(/\/$/, '');
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return s;
    } catch {
      return null;
    }
  };

  const resolved =
    tryOne(process.env.BACKEND_URL) ?? tryOne(process.env.NEXT_PUBLIC_API_URL);
  if (resolved) return resolved;

  if (process.env.BACKEND_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()) {
    console.error(
      '[moon-guide] BACKEND_URL and NEXT_PUBLIC_API_URL must be full URLs (http://...). Got invalid values — using http://localhost:8000. Fix your frontend .env.',
      {
        BACKEND_URL: process.env.BACKEND_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      }
    );
  }

  return 'http://localhost:8000';
}
