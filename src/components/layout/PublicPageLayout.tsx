import Link from "next/link";
import type { ReactNode } from "react";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";

interface PublicPageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  gradient?: boolean;
}

const footerLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
];

export function PublicPageLayout({
  children,
  title,
  description,
  gradient = false,
}: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen">
      {gradient ? (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden text-white">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #4c1d95 0%, #5b21b6 12%, #7c3aed 22%, #0ea5e9 48%, #7dd3fc 72%, #e0e7ff 92%, #f5f3ff 100%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]" />

          <PublicSiteHeader variant="dark" mode="public" />

          <main className="relative z-10 flex-1">{children}</main>
        </div>
      ) : (
        <div className="relative flex min-h-screen flex-col bg-white text-zinc-900">
          <PublicSiteHeader variant="light" mode="public" />

          <main className="flex-1">
            {title && (
              <div className="border-b border-zinc-100 bg-zinc-50 py-12 md:py-16">
                <div className="mx-auto max-w-3xl px-5 md:px-8">
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-3 text-base text-zinc-600">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="py-10 md:py-12">
              {children}
            </div>
          </main>
        </div>
      )}

      <footer className="border-t border-zinc-200 bg-white py-10 text-zinc-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-sm md:flex-row md:px-8">
          <div className="flex items-center gap-6">
            <LiteMoovWordmark size="lg" />
            <p className="hidden text-zinc-500 md:block">
              UGC ads and short-video generation for marketing teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-zinc-900">
              Log in
            </Link>
            <Link
              href="/signup"
              className="font-medium text-violet-700 hover:text-violet-900"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
