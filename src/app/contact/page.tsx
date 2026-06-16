import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { buildContactJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact LiteMoov — Support, Sales & Partnerships",
  description:
    "Contact the LiteMoov team for product support, enterprise sales, partnerships, or legal inquiries. We respond within 24 business hours.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={buildContactJsonLd()} />
      <PublicPageLayout
      title="Contact Us"
      description="We&apos;d love to hear from you. Reach out for support, feedback, or partnerships."
    >
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-900">
                Email Support
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                For general inquiries and support:
              </p>
              <a
                href="mailto:support@litemoov.com"
                className="mt-1 inline-block text-sm font-medium text-violet-700 hover:underline"
              >
                support@litemoov.com
              </a>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-900">
                Sales & Partnerships
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                For enterprise plans and partnerships:
              </p>
              <a
                href="mailto:sales@litemoov.com"
                className="mt-1 inline-block text-sm font-medium text-violet-700 hover:underline"
              >
                sales@litemoov.com
              </a>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-900">
                Legal
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                For legal and privacy matters:
              </p>
              <a
                href="mailto:legal@litemoov.com"
                className="mt-1 inline-block text-sm font-medium text-violet-700 hover:underline"
              >
                legal@litemoov.com
              </a>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-900">
                Response Time
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                We aim to respond to all inquiries within 24 business hours. Priority support is available for Pro plan members.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="font-display text-lg font-semibold text-zinc-900">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="/privacy" className="text-violet-700 hover:underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-violet-700 hover:underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/cookies" className="text-violet-700 hover:underline">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/about" className="text-violet-700 hover:underline">
                  About LiteMoov
                </a>
              </li>
            </ul>

            <div className="mt-6 border-t border-zinc-200 pt-6">
              <h4 className="text-sm font-semibold text-zinc-900">
                Status
              </h4>
              <p className="mt-1 text-sm text-zinc-600">
                All systems operational.
              </p>
            </div>
          </div>
        </div>
      </div>
      </PublicPageLayout>
    </>
  );
}

