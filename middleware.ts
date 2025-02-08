import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const hash = url.hash;

  // 如果 URL 包含验证 token，直接重定向到 verify 页面
  if (hash.includes('access_token') && hash.includes('type=signup')) {
    console.log('Found signup token, redirecting to verify...');
    const verifyUrl = new URL('/verify', req.url);
    verifyUrl.hash = hash;
    return NextResponse.redirect(verifyUrl);
  }

  // 需要认证的路由列表
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/settings',
    // 添加其他需要认证的路由
  ];

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

// 只匹配需要认证的路由
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    // 添加其他需要认证的路由模式
  ],
};
