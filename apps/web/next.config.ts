// Admin web + landing, deployed at www.angkorgo.app (Vercel Root Directory = apps/web).
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Compile the shared workspace package (installed via pnpm workspace).
  transpilePackages: ['@angkorgo/shared'],
};

export default nextConfig;
