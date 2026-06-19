import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { buildLegalJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms and conditions for using LiteMoov's AI video generation, UGC ad creation, and collaboration platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={buildLegalJsonLd({
          path: "/terms",
          name: "Terms of Service",
          description: "Terms and conditions for using LiteMoov.",
        })}
      />
      <PublicPageLayout
      title="Terms of Service"
      description="The rules and guidelines for using LiteMoov."
    >
      <div className="mx-auto max-w-3xl space-y-10 px-5 text-sm leading-7 text-zinc-700 md:px-8 md:text-base">
        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3">
            By accessing or using LiteMoov, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            2. Eligibility
          </h2>
          <p className="mt-3">
            You must be at least 18 years old to use LiteMoov. By creating an account, you represent that you have the legal capacity to enter into these terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            3. Account Registration
          </h2>
          <p className="mt-3">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            4. Acceptable Use
          </h2>
          <p className="mt-3">
            You agree not to use LiteMoov for any unlawful purpose, to generate harmful, offensive, or infringing content, or to attempt to interfere with the platform&apos;s security or performance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            5. Intellectual Property
          </h2>
          <p className="mt-3">
            You retain ownership of the content you generate using LiteMoov. We grant you a limited, non-exclusive license to use the platform. We retain all rights to our technology, trademarks, and branding.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            6. Payment and Credits
          </h2>
          <p className="mt-3">
            Certain features require payment or consumption of credits. Credits are non-refundable and non-transferable unless otherwise stated. Subscription plans auto-renew unless cancelled.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            7. Termination
          </h2>
          <p className="mt-3">
            We may suspend or terminate your account if you violate these terms. You may also close your account at any time. Upon termination, your access to the platform will cease.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            8. Limitation of Liability
          </h2>
          <p className="mt-3">
            LiteMoov is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            9. Changes to Terms
          </h2>
          <p className="mt-3">
            We may modify these terms at any time. We will notify you of material changes. Your continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            10. Contact Us
          </h2>
          <p className="mt-3">
            For questions about these Terms of Service, please contact us at{" "}
            <a href="mailto:legal@litemoov.com" className="text-violet-700 hover:underline">
              legal@litemoov.com
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-zinc-400">
          Last updated: June 2026
        </p>
      </div>
    </PublicPageLayout>
    </>
  );
}

