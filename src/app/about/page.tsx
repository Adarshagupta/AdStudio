import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { buildAboutJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About LiteMoov — AI Video & UGC Ad Platform",
  description:
    "Learn how LiteMoov helps marketing teams create AI-powered UGC ads, short-form videos, and social content with Studio Pro workflows and real-time collaboration.",
  path: "/about",
  keywords: [
    "about LiteMoov",
    "AI video company",
    "UGC ad platform",
    "marketing video software",
  ],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={buildAboutJsonLd()} />
      <PublicPageLayout
        title="About LiteMoov"
        description="Building the future of AI-powered ad creation for marketing teams."
      >
        <div className="mx-auto max-w-3xl space-y-10 px-5 text-sm leading-7 text-zinc-700 md:px-8 md:text-base">
          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Our Mission
            </h2>
            <p className="mt-3">
              LiteMoov was built to democratize high-quality ad creation. We believe every marketing team — regardless of size or budget — should be able to produce professional UGC ads, short-form videos, and social-ready content in minutes, not days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              What We Do
            </h2>
            <p className="mt-3">
              We combine cutting-edge AI models with an intuitive visual editor to help teams ideate, generate, and publish content faster. From text-to-video generation to collaborative Studio Pro flows, our platform is designed for the modern creative workflow.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Key Features
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>AI-powered UGC, video, image, and audio generation</li>
              <li>Studio Pro: a visual node editor for complex production pipelines</li>
              <li>Real-time collaboration with live cursors and synced flows</li>
              <li>Team workspaces with role-based permissions</li>
              <li>Direct publishing to Instagram, TikTok, Facebook, and Reddit</li>
              <li>Credit-based billing with flexible plans</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Our Technology
            </h2>
            <p className="mt-3">
              LiteMoov is built on modern, scalable infrastructure. We use Next.js, PostgreSQL, Redis, and Cloudflare for performance. Our AI integrations span Fireworks AI, OpenAI, Cloudflare Workers AI, LTX, and WaveSpeed AI to deliver the best results across different content types.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              The Team
            </h2>
            <p className="mt-3">
              We are a small team of engineers, designers, and marketers passionate about building tools that empower creative teams. We are always looking for talented people to join us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">
              Get in Touch
            </h2>
            <p className="mt-3">
              Have questions or feedback? Reach out at{" "}
              <a href="mailto:hello@litemoov.com" className="text-violet-700 hover:underline">
                hello@litemoov.com
              </a>
              . We read every message.
            </p>
          </section>

          <p className="text-xs text-zinc-400">
            LiteMoov — UGC ads and short-video generation for marketing teams.
          </p>
        </div>
      </PublicPageLayout>
    </>
  );
}
