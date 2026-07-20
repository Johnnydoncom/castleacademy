import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // nodemailer is a Node.js-only package — keep it external so
  // neither webpack nor Turbopack tries to bundle its binary/native assets.
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
