import type { NextConfig } from "next";

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also ignore TypeScript errors during build (optional)
    ignoreBuildErrors: true,
  },
}

export default nextConfig;
