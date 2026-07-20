import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // pdfkit and nodemailer are Node.js-only packages — keep them external so
  // neither webpack nor Turbopack tries to bundle their binary/native assets.
  serverExternalPackages: ["pdfkit", "nodemailer"],
};

export default nextConfig;
