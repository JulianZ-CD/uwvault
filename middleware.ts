import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 需要认证的路由
  const protectedPaths = ['/dashboard', '/profile', '/settings'];
  const isProtectedPath = protectedPaths.some((route) =>
    path.startsWith(route)
  );

  // 检查是否有认证 token
  const token = req.cookies.get('token')?.value;

  if (isProtectedPath && !token) {
    // 如果没有 token 且访问受保护的路由，重定向到登录页面
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*'],
};
