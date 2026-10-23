/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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

