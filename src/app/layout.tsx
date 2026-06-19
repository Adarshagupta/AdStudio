import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans, Quicksand } from "next/font/google";

import { Analytics } from "@/components/seo/Analytics";
import { GoogleTagManagerBody, GoogleTagManagerHead } from "@/components/seo/GoogleTagManager";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppToaster } from "@/components/ui/sonner";

import "./globals.css";
import { rootMetadata } from "@/lib/seo";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-wordmark",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleTagManagerHead />
      </head>
      <body className={`${nunitoSans.variable} ${quicksand.variable} ${fredoka.variable} font-sans antialiased`}>
        <ThemeProvider>
          <GoogleTagManagerBody />
          {children}
          <Analytics />
          <AppToaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
