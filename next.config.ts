import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';

// Production is a static export served by nginx (which proxies /v1 to Django and /agent to the voice agent).
// In `next dev` the same proxying is done here so the browser stays same-origin.
const config: NextConfig = {
  ...(dev ? {} : { output: 'export' as const }),
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(dev && {
    async rewrites() {
      return [
        { source: '/v1/:path*', destination: 'http://localhost:8000/v1/:path*' },
        { source: '/agent/:path*', destination: 'http://localhost:8100/:path*' },
      ];
    },
  }),
};

export default config;
