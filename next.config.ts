import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.fallback = {
      "aws-sdk": false
    };
    return config;
  },
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    AMPLIFY_ACCESS_KEY_ID: process.env.AMPLIFY_ACCESS_KEY_ID,
    AMPLIFY_SECRET_ACCESS_KEY: process.env.AMPLIFY_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    ODDS_API_KEY: process.env.ODDS_API_KEY,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  }
};

export default nextConfig;