/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/media-thumbnails/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/media-encoded/**',
      },
      {
        protocol: 'https',
        hostname: '*.nself.org',
        pathname: '/media-thumbnails/**',
      },
    ],
  },
};

export default nextConfig;
