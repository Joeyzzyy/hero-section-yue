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
            // 排除图片请求的重定向
            value: '(?!image/*)(.*)',
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