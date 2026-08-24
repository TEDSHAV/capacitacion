import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHA de Venezuela — Portal de Capacitación",
    short_name: "SHA Capacitación",
    description:
      "Portal oficial de capacitación de SHA de Venezuela. Gestión de cursos, facilitadores, certificados y servicios de formación.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0c3f69",
    lang: "es-VE",
    dir: "ltr",
    categories: ["education", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Portal de Facilitadores",
        short_name: "Facilitadores",
        description: "Acceso para facilitadores del portal de capacitación",
        url: "/portal/facilitador/login",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Portal de Clientes",
        short_name: "Clientes",
        description: "Acceso para clientes del portal de capacitación",
        url: "/portal/cliente/login",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
