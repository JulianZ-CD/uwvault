import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 需要认证的路由列表
  const protectedPaths = ['/dashboard', '/profile', '/settings'];

  // 检查是否是需要认证的路由
  const isProtectedPath = protectedPaths.some((route) =>
    path.startsWith(route)
  );

  // 只有访问受保护的路由时才检查认证状态
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
