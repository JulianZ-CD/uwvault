import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // 获取当前请求路径
  const path = req.nextUrl.pathname;

  // 公开路由列表（不需要认证的路由）
  const publicPaths = [
    '/login',
    '/register',
    '/verify',
    '/api',
    '/_next',
    '/favicon.ico',
  ];

  // 检查是否是公开路由
  const isPublicPath = publicPaths.some((publicPath) =>
    path.startsWith(publicPath)
  );

  // 如果是公开路由，直接放行
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 检查认证状态
  const token = req.cookies.get('token');

  // 如果没有认证且不是公开路由，重定向到登录页
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 配置中间件应用的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * /api/py/* (后端API路由)
     * /_next/static (静态文件)
     * /_next/image (图片优化API)
     * /favicon.ico (浏览器图标)
     */
    '/((?!api/py|_next/static|_next/image|favicon.ico).*)',
  ],
};
