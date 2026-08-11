import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHA de Venezuela — Portal de Capacitación",
    short_name: "SHA Capacitación",
    description:
      "Portal oficial de capacitación de SHA de Venezuela. Gestión de cursos, facilitadores, certificados y servicios de formación.",
    start_url: "/portal/facilitador/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#C30DFF",
    lang: "es-VE",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
