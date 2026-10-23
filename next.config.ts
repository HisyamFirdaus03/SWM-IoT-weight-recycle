import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone, so the Docker image needs no node_modules install.
  output: "standalone",
};

export default nextConfig;
