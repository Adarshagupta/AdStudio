import Link from "next/link";
import type { Metadata } from "next";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { buildNotFoundMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNotFoundMetadata();

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-100 px-5 py-6 md:px-8">
        <Link href="/" aria-label="LiteMoov home">
          <LiteMoovWordmark size="lg" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">404</p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-zinc-600 md:text-base">
          The page you requested doesn&apos;t exist or may have moved. Head back to the homepage or
          explore our blog and features.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Go home
          </Link>
          <Link
            href="/blog"
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300"
          >
            Read the blog
          </Link>
          <Link
            href="/features"
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300"
          >
            View features
          </Link>
        </div>
      </main>
    </div>
  );
}
