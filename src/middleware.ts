import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (userId && req.nextUrl.pathname.startsWith('/sign-in')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  if (!userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
