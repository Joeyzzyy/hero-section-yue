/** @type {import('next').NextConfig} */

const DOMAIN = process.env.DOMAIN;

const isLocal = process.env.NODE_ENV === 'development';

const nextConfig = {
  images: {
    domains: isLocal ? [] : [DOMAIN],
    unoptimized: true,
  },
  async redirects() {
    return [];
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