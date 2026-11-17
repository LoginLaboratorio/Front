import type { NextConfig } from "next";

// Backend Django (solo se usa en el servidor de Next, no en el navegador)
const BACKEND_URL = (
  process.env.BACKEND_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Django usa URLs con "/" final: no dejar que Next las redirija sin ella
  skipTrailingSlashRedirect: true,
  // Proxy: el navegador llama a /api/... en el mismo origen (localhost:3000)
  // y así las cookies de sesión y CSRF de Django funcionan.
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
