"use client";

import { LandingFeatureIllustrations } from "@/components/landing/LandingFeatureIllustrations";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";

export function LandingCreateSection() {
  return (
    <section id="product" className="relative overflow-hidden bg-[#f5f3ff] py-20 text-zinc-900 md:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-[12%] h-[520px] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.14),transparent_68%)]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <LandingHowItWorks />
        <LandingFeatureIllustrations />
      </div>
    </section>
  );
}
