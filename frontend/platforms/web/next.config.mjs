import withPWA from 'next-pwa';

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

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*\.(png|jpg|jpeg|webp|svg|gif|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /^https?:\/\/localhost:8080\/v1\/graphql/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'graphql-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.nself\.org\/v1\/graphql/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'graphql-cache-prod',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https?.*\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'nextjs-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
