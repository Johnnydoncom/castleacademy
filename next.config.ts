import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  images: {
    unoptimized: true,
  },
  typescript: {
    // Use tsconfig.next.json instead of the Vite tsconfig.json
    tsconfigPath: "./tsconfig.next.json",
  },
};

export default nextConfig;
