import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'workflow.digitalfactory.co.th',
      },
    ],
  },
};

export default nextConfig;
