import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Routes that need authentication
  const protectedPaths = ['/dashboard', '/profile', '/settings'];

  // Check if the route needs authentication
  const isProtectedPath = protectedPaths.some((route) =>
    path.startsWith(route)
  );

  // Only check authentication status when accessing protected routes
  if (isProtectedPath) {
    const token = req.cookies.get('token');
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*'],
};
