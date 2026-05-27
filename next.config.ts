import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.*"],
  output: "export",
  basePath: isProd ? "/cbir-screening-tool" : "",
  images: { unoptimized: true },
};

export default nextConfig;