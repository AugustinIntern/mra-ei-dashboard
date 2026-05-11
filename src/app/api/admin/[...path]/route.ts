/** File: Server route that proxies authenticated dashboard admin requests to the upstream API. */
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;
const API_INTERNAL_URL = process.env.API_INTERNAL_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

type RouteContext = {
  params?: { path?: string[] } | Promise<{ path?: string[] }>;
};

// ── Route Helpers

/**
 * Resolves dynamic catch-all route params into a normalized path string.
 * @param context Route context from Next.js.
 * @returns Slash-separated path segments.
 */
async function resolvePathSegments(context: RouteContext): Promise<string> {
  const resolvedParams = context.params ? await context.params : undefined;
  const segments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
  return segments.join('/');
}

function normalizeBaseUrl(baseUrl: string, pathSegments: string): string {
  const rawBase = baseUrl.replace(/\/+$/, '');
  if (rawBase.endsWith('/admin') && pathSegments.startsWith('admin/')) {
    return rawBase.slice(0, -'/admin'.length);
  }
  return rawBase;
}

function buildUpstreamCandidates(pathSegments: string): string[] {
  const candidates = [API_INTERNAL_URL, API_URL].filter((value): value is string => Boolean(value));
  const uniqueBases = Array.from(new Set(candidates));
  return uniqueBases.map((base) => normalizeBaseUrl(base, pathSegments));
}

function buildPathCandidates(pathSegments: string): string[] {
  const normalized = pathSegments.replace(/^\/+/, '');
  const withoutAdminPrefix = normalized.replace(/^admin\/+/, '');
  const variants = [normalized, withoutAdminPrefix].filter(Boolean);
  return Array.from(new Set(variants));
}

/**
 * Forwards a dashboard request to the upstream admin API after Clerk auth validation.
 * @param request Incoming request.
 * @param context Route context containing catch-all path segments.
 * @returns Upstream response payload and status.
 */
async function proxy(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((!API_URL && !API_INTERNAL_URL) || !ADMIN_SECRET) {
      return NextResponse.json(
        {
          error: 'Server proxy is not configured',
          missing: {
            API_URL: !API_URL && !API_INTERNAL_URL,
            API_INTERNAL_URL: !API_INTERNAL_URL,
            ADMIN_SECRET: !ADMIN_SECRET,
          },
        },
        { status: 500 }
      );
    }

    const pathSegments = await resolvePathSegments(context);
    if (!pathSegments) {
      return NextResponse.json({ error: 'Missing proxy path segments' }, { status: 400 });
    }

    const headers = new Headers(request.headers);
    headers.set('x-admin-secret', ADMIN_SECRET);
    headers.delete('host');

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const queryString = request.nextUrl.searchParams.toString();
    const upstreamBases = buildUpstreamCandidates(pathSegments);
    const pathCandidates = buildPathCandidates(pathSegments);
    let lastError: string | null = null;

    for (const baseUrl of upstreamBases) {
      for (const pathCandidate of pathCandidates) {
        const targetUrl = `${baseUrl}/${pathCandidate}${queryString ? `?${queryString}` : ''}`;
        try {
          const upstream = await fetch(targetUrl, init);
          const responseHeaders = new Headers(upstream.headers);
          return new NextResponse(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: responseHeaders,
          });
        } catch (error: unknown) {
          lastError = error instanceof Error ? error.message : 'Proxy request failed';
        }
      }
    }

    return NextResponse.json(
      { error: 'Proxy request failed', message: lastError ?? 'Unable to reach upstream API' },
      { status: 500 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    return NextResponse.json(
      { error: 'Proxy request failed', message },
      { status: 500 }
    );
  }
}

// ── Route Handlers

/**
 * Proxies GET requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies POST requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies PUT requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies PATCH requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies DELETE requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies OPTIONS requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

/**
 * Proxies HEAD requests to the upstream admin API.
 * @param request Incoming request.
 * @param context Route context.
 * @returns Proxied response.
 */
export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
