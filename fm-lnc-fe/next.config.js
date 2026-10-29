/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  basePath: '/fm',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/fm',
        basePath: false,
        permanent: false,
      },
      {
        source: '/lnc',
        destination: '/fm',
        basePath: false,
        permanent: true,
      },
      {
        source: '/lnc/:path*',
        destination: '/fm/:path*',
        basePath: false,
        permanent: true,
      },
      {
        source: '/confederation',
        destination: '/fm',
        basePath: false,
        permanent: true,
      },
      {
        source: '/confederation',
        destination: '/',
        permanent: true,
      },
      {
        source: '/favicon.ico',
        destination: '/fm/favicon.ico',
        basePath: false,
        permanent: false,
      },
      {
        source: '/favicon.png',
        destination: '/fm/favicon.png',
        basePath: false,
        permanent: false,
      },
      {
        source: '/apple-touch-icon.png',
        destination: '/fm/apple-touch-icon.png',
        basePath: false,
        permanent: false,
      },
      {
        source: '/logo.png',
        destination: '/fm/logo.png',
        basePath: false,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
        basePath: false,
      },
    ];
  },
};

module.exports = nextConfig;
