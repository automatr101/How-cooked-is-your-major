import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
    ],
  },
  // A second Vercel project (cooked-major) also builds this repo. Vercel cannot redirect between two
  // projects' addresses, so the app does it: anything opened on the duplicate address goes to the main
  // site, keeping the path and query string (so UTM tags and ?major= links survive).
  // Only the exact duplicate host matches; previews and the main site are untouched.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "cooked-major.vercel.app" }],
        destination: "https://how-cooked-is-your-major.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
