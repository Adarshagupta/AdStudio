import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clapperboard,
  Instagram,
  Layers3,
  Share2,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Clapperboard,
    title: "UGC ad formats",
    description: "Talking head, brain rot, review-style, and split-screen templates built for paid social.",
  },
  {
    icon: Workflow,
    title: "Studio Pro flows",
    description: "Node-based canvas for prompts, characters, images, audio, and video — run nodes individually or all at once.",
  },
  {
    icon: Share2,
    title: "Social publishing",
    description: "Connect Instagram, TikTok, Facebook, and Reddit from one workspace when you're ready to publish.",
  },
  {
    icon: BarChart3,
    title: "Workspace analytics",
    description: "Track generations, render times, and team activity without leaving the platform.",
  },
];

const steps = [
  {
    step: "01",
    title: "Describe your ad",
    description: "Drop a product brief, audience, or hook — or wire up a full flow in Studio Pro.",
  },
  {
    step: "02",
    title: "Generate & refine",
    description: "Scripts, voice, visuals, and video drafts powered by Cloudflare AI with per-node control.",
  },
  {
    step: "03",
    title: "Ship to channels",
    description: "Export from your library or publish through connected social accounts.",
  },
];

const formats = [
  { name: "UGC Talking Head", tone: "Creator-led scripts for Meta & TikTok" },
  { name: "Brain Rot", tone: "Fast captions and retention hooks" },
  { name: "Review Style", tone: "Proof-driven outcomes and social proof" },
  { name: "Split Screen", tone: "Narration plus product motion" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-purple-200/30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[24rem] w-[24rem] rounded-full bg-violet-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-100/30 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-xs font-semibold text-purple-950">
            AS
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Ad Studio</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
          <a href="#features" className="transition hover:text-zinc-900">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-zinc-900">
            How it works
          </a>
          <a href="#formats" className="transition hover:text-zinc-900">
            Formats
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-8 md:pb-28 md:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-1.5 text-xs font-medium text-purple-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                UGC ads, flows, and social — in one workspace
              </div>
              <div className="space-y-5">
                <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 md:text-6xl">
                  Create scroll-stopping ads without a production team.
                </h1>
                <p className="max-w-xl text-base leading-7 text-zinc-600 md:text-lg">
                  Ad Studio helps marketing teams generate UGC-style video ads, orchestrate multi-step AI flows,
                  and connect social channels — from brief to publish.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 rounded-full px-7" asChild>
                  <Link href="/signup">
                    Start free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-full bg-white px-7" asChild>
                  <Link href="/login">Sign in to workspace</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  25 free credits on signup
                </span>
                <span className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-purple-600" />
                  Studio Pro node editor
                </span>
                <span className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-purple-600" />
                  Instagram · TikTok · Facebook · Reddit
                </span>
              </div>
            </div>

            <Card className="relative overflow-hidden border-0 bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-zinc-500">Studio Pro · Untitled flow</span>
                </div>
              </div>
              <div className="relative min-h-[22rem] bg-[radial-gradient(circle,rgba(161,161,170,0.25)_1px,transparent_1px)] bg-[length:24px_24px] p-6">
                <div className="absolute left-8 top-8 w-44 rounded-2xl border border-purple-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
                      <Sparkles className="h-3.5 w-3.5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Text</p>
                      <p className="text-[10px] text-zinc-500">Script draft</p>
                    </div>
                  </div>
                  <div className="h-14 rounded-xl bg-zinc-50" />
                </div>
                <div className="absolute left-56 top-24 w-44 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
                      <Clapperboard className="h-3.5 w-3.5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Image Gen</p>
                      <p className="text-[10px] text-zinc-500">Stable Diffusion XL</p>
                    </div>
                  </div>
                  <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-violet-100">
                    <div className="h-8 w-8 rounded-lg bg-white/70" />
                  </div>
                </div>
                <svg className="absolute left-[12.5rem] top-[4.5rem] h-16 w-24 text-purple-300" viewBox="0 0 96 64" fill="none">
                  <path d="M0 32 C24 32, 24 8, 48 8 C72 8, 72 32, 96 32" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                </svg>
                <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-md">
                  <span className="text-[10px] text-zinc-500">+ Prompt</span>
                  <span className="text-[10px] text-zinc-500">+ Image</span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">Run all</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="features" className="border-y border-zinc-100 bg-white/70 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-sm font-medium text-purple-700">Everything in one place</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                From first prompt to published ad
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="border-zinc-100 bg-white p-6 shadow-none transition hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-medium">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-12 max-w-2xl">
              <p className="text-sm font-medium text-purple-700">How it works</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Three steps to launch-ready creative
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                  <p className="font-display text-3xl font-semibold text-purple-200">{item.step}</p>
                  <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="formats" className="border-t border-zinc-100 bg-white/70 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Ad formats</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Built for performance marketers
                </h2>
              </div>
              <Button variant="outline" className="bg-white" asChild>
                <Link href="/signup">Explore all formats</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map((format) => (
                <Card key={format.name} className="border-zinc-100 bg-white p-5 shadow-none">
                  <div className="mb-8 h-24 rounded-2xl bg-gradient-to-br from-zinc-50 to-purple-50" />
                  <h3 className="text-sm font-medium">{format.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{format.tone}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-purple-700 via-purple-600 to-violet-600 p-8 text-white shadow-[0_20px_60px_rgba(124,58,237,0.25)] md:p-12">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Ready to ship your next winning ad?
                </h2>
                <p className="mt-4 text-base leading-7 text-purple-100">
                  Create a free workspace, generate your first UGC ad, and connect social accounts when you&apos;re ready to publish.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button size="lg" variant="secondary" className="h-12 rounded-full bg-white text-purple-700 hover:bg-purple-50" asChild>
                    <Link href="/signup">Create free account</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link href="/login">I already have an account</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-100 text-[10px] font-semibold text-purple-950">
              AS
            </div>
            <span>Ad Studio</span>
          </div>
          <p>UGC ad and short-video generation for marketing teams.</p>
        </div>
      </footer>
    </div>
  );
}
