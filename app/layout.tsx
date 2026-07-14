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

export const metadata: Metadata = {
  title: "SHA | Business",
  description: "Portal de negocios y capacitación",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
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
