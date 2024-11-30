import { NextResponse } from 'next/server';

// 需要阻止收录的域名列表
const BLOCKED_DOMAINS = [
  'zhuyue.tech',
];

export function middleware(request) {
  // 获取当前请求的路径
  const { pathname } = request.nextUrl;

  // 排除掉 Next.js 的内部路径和非文章路径
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      !pathname.startsWith('/articles/')) {
    return NextResponse.next();
  }

  // 检查请求是否已经被处理过
  if (request.headers.get('x-middleware-rewrite')) {
    return NextResponse.next();
  }

  // 创建新的 URL
  const url = new URL(pathname, `https://${process.env.DOMAIN}`);
  
  // 设置一个标记，防止循环重定向
  const response = NextResponse.rewrite(url);
  response.headers.set('x-middleware-rewrite', '1');
  
  return response;
}

export const config = {
  // 只匹配 /articles 开头的路径
  matcher: '/articles/:path*',
};