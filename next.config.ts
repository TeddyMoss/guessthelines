import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.fallback = {
      "aws-sdk": false
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['aws-sdk']
  },
  images: {
    unoptimized: true
  },
  typescript: {
    // Add if we want to deploy despite TS errors
    ignoreBuildErrors: true
  },
  eslint: {
    // Add if we want to deploy despite ESLint errors
    ignoreDuringBuilds: true
  }
};

export default nextConfig;