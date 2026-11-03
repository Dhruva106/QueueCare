import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "mysql2", "ioredis", "neo4j-driver"],
};

export default nextConfig;
