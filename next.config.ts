import type { NextConfig } from "next";

const nextConfig: NextConfig & { turbopack?: { root?: string } } = {
  turbopack: {
    // Set the workspace root explicitly to avoid "inferred workspace root" warnings
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

