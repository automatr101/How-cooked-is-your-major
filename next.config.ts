import type { NextConfig } from "next";

// Sent with every response: pages, files and the API. The content policy is deliberately small. It stops other websites
// from putting ours in a frame (clickjacking) and shuts the <base>, plug-in and form-target routes an injected tag
// could use. It does not restrict scripts: the site loads Google Analytics and AdSense, so a script policy has to be
// written against them and tested on real pages, which is a separate change. HSTS is already sent by Vercel.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // do not announce the framework on every page
  // The PDF library does its own file and font handling, so it stays outside the bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Nothing on the site uses next/image, so Next's image optimizer is switched off instead of left reachable: it has
  // had a run of vulnerabilities of its own and could only ever be an attack surface here. If next/image is adopted
  // later, remove this line (and list the remote hosts it should be allowed to fetch from).
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
