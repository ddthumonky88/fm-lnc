/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/lnc',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/lnc',
        basePath: false,
        permanent: false,
      },
      {
        source: '/confederation',
        destination: '/lnc',
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

