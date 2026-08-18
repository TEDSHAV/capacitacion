import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Output configuration for Docker deployment
  output: "standalone",

  // Turbopack configuration - disabled during production build due to memory constraints
  turbopack: process.env.TURBOPACK_DISABLED === "1" ? undefined : {},

  // Security headers and optimizations
  poweredByHeader: false,

  // Image optimization with remotePatterns (new way)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "") || "",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Experimental features
  experimental: {
    optimizeCss: false,
    optimizePackageImports: ["@supabase/supabase-js", "lucide-react", "jspdf", "recharts"],
    // Server Actions body size limit - allows mobile camera photo uploads
    // Images are compressed client-side before upload, but this is a safety net
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Redirects for SEO and security
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${process.env.NEXT_PUBLIC_SHELL_URL || ""} http://localhost:3000`,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
