import Link from "next/link";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";

const FOOTER_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/#faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-10 text-zinc-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-sm md:flex-row md:px-8">
        <div className="flex items-center gap-6">
          <LiteMoovWordmark size="lg" />
          <p className="hidden text-zinc-500 md:block">
            UGC ads and short-video generation for marketing teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {FOOTER_LINKS.map((link) => (
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
  );
}
