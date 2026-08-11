import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import ShellAuthProvider from "@/components/providers/ShellAuthProvider";
import URLSync from "@/components/utils/URLSync";
import { Suspense } from "react";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SHELL_URL ||
  "https://capacitacion.shadevenezuela.com.ve";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SHA de Venezuela | Portal de Capacitación",
    template: "%s | SHA de Venezuela",
  },
  description:
    "Portal oficial de capacitación de SHA de Venezuela. Gestión de cursos, facilitadores, certificados y servicios de formación.",
  applicationName: "SHA de Venezuela — Portal de Capacitación",
  authors: [{ name: "SHA de Venezuela" }],
  creator: "SHA de Venezuela",
  publisher: "SHA de Venezuela",
  keywords: [
    "SHA de Venezuela",
    "capacitación",
    "portal de facilitadores",
    "certificados",
    "formación",
  ],
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: APP_URL,
    siteName: "SHA de Venezuela — Portal de Capacitación",
    title: "SHA de Venezuela | Portal de Capacitación",
    description:
      "Portal oficial de capacitación de SHA de Venezuela. Gestión de cursos, facilitadores, certificados y servicios de formación.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "SHA de Venezuela",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SHA de Venezuela | Portal de Capacitación",
    description:
      "Portal oficial de capacitación de SHA de Venezuela.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/logo.png" }],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-x-hidden`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ShellAuthProvider>
            <Suspense fallback={null}>
              <URLSync />
            </Suspense>
            {children}
          </ShellAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
