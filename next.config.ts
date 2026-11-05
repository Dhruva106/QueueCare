import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "mysql2", "ioredis", "neo4j-driver"],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:5001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
