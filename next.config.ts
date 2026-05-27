import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/cbir-screening-tool" : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.*"],
  output: "export",
  basePath: basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;