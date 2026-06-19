import Link from "next/link";
import { Layers3 } from "lucide-react";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { PublicSiteHeaderCompact } from "@/components/layout/PublicSiteHeader";
import { LandingCreateSection } from "@/components/landing/LandingCreateSection";
import { LandingHeroInput } from "@/components/landing/LandingHeroInput";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingVideoMarquee } from "@/components/landing/LandingVideoMarquee";
import { FeaturedVideo } from "@/components/shared/FeaturedVideo";
import { Button } from "@/components/ui/button";

const FEATURED_VIDEOS = [
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000013/videos/video-1781002816972-4evq9xnzkpa-raw/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000006/videos/video-1780925988521-idb1rs3nci-raw/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/model-gen-video/901626772_0-b95110c8-794f-4913-a749-059971d7465d/video.mp4?v=2",
  "https://cdn.aorizon.cn/output/720p_h265/user-uploads/1000000000012/videos/video-1779274348299-d9tq2wr9su8-raw/video.mp4?v=2",
];

export function LandingPage() {
  return (
    <div className="min-h-screen text-white">
      <section className="relative flex min-h-screen flex-col overflow-x-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #4c1d95 0%, #5b21b6 12%, #7c3aed 22%, #0ea5e9 48%, #7dd3fc 72%, #e0e7ff 92%, #f5f3ff 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]" />

        <PublicSiteHeaderCompact variant="dark" mode="landing" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-start px-5 pb-8 pt-16 text-center md:px-8 md:pt-20 md:pb-12">
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.35rem]">
            What will you create today?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
            Make AI-powered UGC ads, Studio Pro flows, and social-ready videos — all in one workspace.
          </p>

          <LandingHeroInput />

          <LandingVideoMarquee />

          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/75">
            <span className="flex items-center gap-1.5">
              <Layers3 className="h-4 w-4" />
              Start free — paid plans include credits equal to your subscription
            </span>
            <span>Payment method optional</span>
          </p>
        </div>
      </section>

      <LandingCreateSection />

      <section className="bg-zinc-50 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">
            Featured
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURED_VIDEOS.map((url, i) => (
              <FeaturedVideo key={i} src={url} />
            ))}
          </div>
        </div>
      </section>

      <LandingPricing />

      <LandingFAQ />

      <section id="teams" className="border-t border-zinc-100 bg-zinc-50 py-16 text-zinc-900 md:py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center md:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">Teams</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Collaborate on the same canvas
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-600 md:text-base">
              Invite teammates, set permissions, and edit Studio Pro sessions together with live cursors and synced
              flows.
            </p>
            <Button asChild variant="outline" className="mt-8 rounded-full bg-white">
              <Link href="/signup">Invite your team</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer id="help" className="border-t border-zinc-200 bg-white py-10 text-zinc-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 text-sm md:flex-row md:px-8">
          <div className="flex items-center gap-6">
            <LiteMoovWordmark size="lg" />
            <p className="hidden text-zinc-500 md:block">UGC ads and short-video generation for marketing teams.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/features" className="hover:text-zinc-900">Features</Link>
            <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
            <Link href="/blog" className="hover:text-zinc-900">Blog</Link>
            <Link href="/#faq" className="hover:text-zinc-900">FAQ</Link>
            <Link href="/privacy" className="hover:text-zinc-900">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-900">Terms</Link>
            <Link href="/cookies" className="hover:text-zinc-900">Cookies</Link>
            <Link href="/contact" className="hover:text-zinc-900">Contact</Link>
            <Link href="/about" className="hover:text-zinc-900">About</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-zinc-900">
              Log in
            </Link>
            <Link href="/signup" className="font-medium text-violet-700 hover:text-violet-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
