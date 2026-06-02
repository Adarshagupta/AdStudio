import type { Metadata } from "next";
import { Nunito_Sans, Quicksand } from "next/font/google";

import "./globals.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Ad Studio",
  description: "UGC ad and short-video generation platform for marketing teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunitoSans.variable} ${quicksand.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
