import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.docentesmart.com',
        pathname: '/examenes/**',
      },
    ],
  },
};

export default nextConfig;