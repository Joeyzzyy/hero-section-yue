/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path+',
        destination: '/',
        permanent: true,
        has: [
          {
            type: 'header',
            key: 'accept',
            // 只重定向 text/html 和 application/* 类型的请求
            value: '(text/html|application/.*)',
          },
        ],
      }
    ];
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
  // 临时处理difyherosection测试
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://dify.sheet2email.com/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;