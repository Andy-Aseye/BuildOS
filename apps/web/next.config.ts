import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Workspace packages only — listing `@tanstack/react-query` here can confuse server chunk splitting (missing `vendor-chunks/@tanstack.js`). */
  transpilePackages: ['@buildos/shared'],
};

export default nextConfig;
