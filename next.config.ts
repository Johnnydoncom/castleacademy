import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // pdfkit ships .afm font-metric files it reads from disk at runtime.
  // Keep it external so the server bundle doesn't try to inline those assets.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
