const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.fallback = {
      "aws-sdk": false
    };
    return config;
  }
} as const;

export default nextConfig;