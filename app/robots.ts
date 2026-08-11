import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SHELL_URL ||
  "https://capacitacion.shadevenezuela.com.ve";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow crawling of public-facing pages (login portals, certificate
        // verification) so search engines can build reputation for the domain.
        userAgent: "*",
        allow: [
          "/portal/facilitador/login",
          "/portal/cliente/login",
          "/verify-certificate",
        ],
        disallow: [
          "/dashboard",
          "/api",
          "/portal/facilitador/dashboard",
          "/portal/cliente/dashboard",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
