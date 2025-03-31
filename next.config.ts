import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    turbo: {
      logLevel: 'error'
    }
  }
};

export default nextConfig;
