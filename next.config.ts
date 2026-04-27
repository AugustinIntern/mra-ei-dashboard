import type { NextConfig } from "next";

const IP_ADDRESS = process.env.NEXT_PUBLIC_API_URL || '';
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${IP_ADDRESS}/:path*`, // The remote API
      },
    ];
  },
};



export default nextConfig;
