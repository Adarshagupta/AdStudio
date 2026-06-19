import Link from "next/link";
import type { ReactNode } from "react";

import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import type { SeoLandingPage } from "@/lib/seo-pages";

type SeoFeaturePageProps = {
  page: SeoLandingPage;
  children?: ReactNode;
};

export function SeoFeaturePage({ page, children }: SeoFeaturePageProps) {
  return (
    <PublicPageLayout title={page.h1} description={page.subtitle}>
      <div className="mx-auto max-w-3xl space-y-10 px-5 md:px-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/features"
            className="text-sm font-medium text-violet-700 transition hover:text-violet-900"
          >
            ← All features
          </Link>
        </div>

        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-semibold text-zinc-900">{section.heading}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-700 md:text-base">{section.body}</p>
          </section>
        ))}

        {page.faq?.length ? (
          <section>
            <h2 className="font-display text-xl font-semibold text-zinc-900">FAQ</h2>
            <div className="mt-4 space-y-6">
              {page.faq.map((item) => (
                <div key={item.question}>
                  <h3 className="text-base font-semibold text-zinc-900">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-700 md:text-base">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-6 py-8 text-center">
          <p className="font-display text-lg font-semibold text-zinc-900">Ready to get started?</p>
          <p className="mt-2 text-sm text-zinc-600">
            Create your workspace and start generating with LiteMoov today.
          </p>
          <Link
            href={page.ctaHref}
            className="mt-5 inline-flex rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            {page.ctaLabel}
          </Link>
        </div>

        {children}
      </div>
    </PublicPageLayout>
  );
}
