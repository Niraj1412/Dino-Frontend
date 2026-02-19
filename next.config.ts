import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  turbopack: {
    root: configRoot,
  },
};

export default nextConfig;
