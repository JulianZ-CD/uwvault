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

  // 公开路由列表
  const publicPaths = [
    '/login',
    '/register',
    '/verify',
    '/api',
    '/_next',
    '/favicon.ico',
  ];

  // 检查是否是公开路由
  const isPublicPath = publicPaths.some((route) => path.startsWith(route));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // 检查认证状态
  const token = req.cookies.get('token');

  // 未认证用户重定向到登录页面
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/py|_next/static|_next/image|favicon.ico).*)'],
};
