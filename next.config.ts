import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      "aws-sdk": false
    };
    return config;
  }
};

export default nextConfig;