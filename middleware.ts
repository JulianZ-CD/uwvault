// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   const url = req.nextUrl;
//   const path = url.pathname;
//   const hash = url.hash;
//   const searchParams = url.searchParams;

//   console.log('Middleware - Path:', path);
//   console.log('Middleware - Hash:', hash);
//   console.log('Middleware - Search params:', Object.fromEntries(searchParams));

//   // 特殊处理：如果是登录页面但有验证token，重定向到verify
//   if (
//     path === '/login' &&
//     hash.includes('access_token') &&
//     hash.includes('type=signup')
//   ) {
//     console.log('Found signup token on login page, redirecting to verify...');
//     const verifyUrl = new URL('/verify', req.url);
//     // 清除 from 参数，保留 hash
//     verifyUrl.search = '';
//     verifyUrl.hash = hash;
//     console.log('Redirecting to:', verifyUrl.toString());
//     return NextResponse.redirect(verifyUrl);
//   }

//   // 检查是否有 access_token（在根路径）
//   if (
//     path === '/' &&
//     hash.includes('access_token') &&
//     hash.includes('type=signup')
//   ) {
//     console.log('Found signup token on root, redirecting to verify...');
//     const verifyUrl = new URL('/verify', req.url);
//     verifyUrl.hash = hash;
//     return NextResponse.redirect(verifyUrl);
//   }

//   // 公开路由列表
//   const publicPaths = [
//     '/login',
//     '/register',
//     '/verify',
//     '/api',
//     '/_next',
//     '/favicon.ico',
//   ];

//   // 检查是否是公开路由
//   const isPublicPath = publicPaths.some((route) => path.startsWith(route));

//   if (isPublicPath) {
//     return NextResponse.next();
//   }

//   // 检查认证状态
//   const token = req.cookies.get('token');

//   // 只有在没有 token 且不是公开路由时才重定向到登录
//   if (!token && !isPublicPath && !hash.includes('access_token')) {
//     const loginUrl = new URL('/login', req.url);
//     loginUrl.searchParams.set('from', path);
//     return NextResponse.redirect(loginUrl);
//   }

//   return NextResponse.next();
// }

// // 配置中间件应用的路由
// export const config = {
//   matcher: [
//     /*
//      * 匹配所有路径除了:
//      * /api/py/* (后端API路由)
//      * /_next/static (静态文件)
//      * /_next/image (图片优化API)
//      * /favicon.ico (浏览器图标)
//      */
//     '/((?!api/py|_next/static|_next/image|favicon.ico).*)',
//   ],
// };

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const hash = url.hash;
  const searchParams = url.searchParams;

  console.log('Middleware - Path:', path);
  console.log('Middleware - Hash:', hash);
  console.log('Middleware - Search params:', Object.fromEntries(searchParams));

  // 特殊处理：如果是登录页面但有验证token，重定向到verify
  if (
    path === '/login' &&
    hash.includes('access_token') &&
    hash.includes('type=signup')
  ) {
    console.log('Found signup token on login page, redirecting to verify...');
    const verifyUrl = new URL('/verify', req.url);
    // 清除 from 参数，保留 hash
    verifyUrl.search = '';
    verifyUrl.hash = hash;
    console.log('Redirecting to:', verifyUrl.toString());
    return NextResponse.redirect(verifyUrl);
  }

  // 检查是否有 access_token（在根路径）
  if (
    path === '/' &&
    hash.includes('access_token') &&
    hash.includes('type=signup')
  ) {
    console.log('Found signup token on root, redirecting to verify...');
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

  // 只有在没有 token 且不是公开路由时才重定向到登录
  if (!token && !isPublicPath && !hash.includes('access_token')) {
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
