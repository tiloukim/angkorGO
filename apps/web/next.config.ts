import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Compile the shared workspace package.
  transpilePackages: ['@angkorgo/shared'],
};

export default nextConfig;
