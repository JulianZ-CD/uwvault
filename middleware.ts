// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   const path = req.nextUrl.pathname;

//   // 公开路由
//   const publicPaths = ['/login', '/register'];
//   const isPublicPath = publicPaths.some((route) => path.startsWith(route));

//   // 获取 token
//   const token = req.cookies.get('token')?.value;

//   // 如果是公开路由且已登录，重定向到首页
//   if (isPublicPath && token) {
//     return NextResponse.redirect(new URL('/', req.url));
//   }

//   // 如果不是公开路由且未登录，重定向到登录页
//   if (!isPublicPath && !token) {
//     const loginUrl = new URL('/login', req.url);
//     loginUrl.searchParams.set('from', path);
//     return NextResponse.redirect(loginUrl);
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/login', '/register', '/profile', '/dashboard', '/settings'],
// };

// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   // 暂时返回 next()，不做任何拦截
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/login', '/register', '/profile', '/dashboard', '/settings'],
// };

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 只保护 /profile 路由
  if (path.startsWith('/profile')) {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*'], // 只匹配 profile 相关路由
};
