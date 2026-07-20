import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // pdfkit and nodemailer are Node.js-only packages — keep them external so
  // neither webpack nor Turbopack tries to bundle their binary/native assets.
  serverExternalPackages: ["pdfkit", "nodemailer"],
  // pdfkit reads .afm font-metrics files at runtime via fs.readFileSync.
  // Next.js's file tracer cannot detect dynamic FS reads, so we must
  // explicitly include the entire pdfkit/js directory in the serverless bundle.
  // Without this, every generateBookingPdf() call throws on production.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfkit/js/**/*"],
  },
};

export default nextConfig;
