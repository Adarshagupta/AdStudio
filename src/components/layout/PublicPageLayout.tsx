import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface PublicPageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  gradient?: boolean;
}

const navLinks = [
  { label: "Product", href: "/#product" },
  { label: "Studio Pro", href: "/#studio" },
  { label: "Plans", href: "/#plans" },
  { label: "Teams", href: "/#teams" },
  { label: "Help", href: "/#help" },
];

const footerLinks = [
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
    <div className="min-h-screen text-white">
      {gradient ? (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #4c1d95 0%, #5b21b6 12%, #7c3aed 22%, #0ea5e9 48%, #7dd3fc 72%, #e0e7ff 92%, #f5f3ff 100%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]" />

          <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-4 pt-10 md:px-8 md:pt-14 md:pb-5">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight text-white md:text-[1.65rem]"
            >
              Ad Studio
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm font-medium text-white/95 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/signup"
                className="rounded-full px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:px-4"
              >
                Sign up
              </Link>
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full border-0 bg-white px-4 text-sm font-semibold text-violet-950 shadow-md hover:bg-white/95"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </header>

          <main className="relative z-10 flex-1">{children}</main>
        </div>
      ) : (
        <div className="relative flex min-h-screen flex-col bg-white text-zinc-900">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-4 pt-10 md:px-8 md:pt-14 md:pb-5">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight text-zinc-900 md:text-[1.65rem]"
            >
              Ad Studio
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition hover:text-zinc-900"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/signup"
                className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 sm:px-4"
              >
                Sign up
              </Link>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-zinc-200 px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </header>

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
            <span className="font-display text-lg font-semibold text-zinc-900">
              Ad Studio
            </span>
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
