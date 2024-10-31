const nextConfig = {
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = {
      "aws-sdk": false
    };
    return config;
  }
} as const;

export default nextConfig;