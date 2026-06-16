import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { buildLegalJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Policy",
  description: "How LiteMoov uses cookies, local storage, and similar technologies on litemoov.com.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <>
      <JsonLd
        data={buildLegalJsonLd({
          path: "/cookies",
          name: "Cookie Policy",
          description: "How LiteMoov uses cookies and similar technologies.",
        })}
      />
      <PublicPageLayout
      title="Cookie Policy"
      description="How we use cookies and similar technologies."
    >
      <div className="mx-auto max-w-3xl space-y-10 px-5 text-sm leading-7 text-zinc-700 md:px-8 md:text-base">
        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            1. What Are Cookies
          </h2>
          <p className="mt-3">
            Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, authenticate your session, and analyze how the site is used.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            2. How We Use Cookies
          </h2>
          <p className="mt-3">
            We use cookies for the following purposes:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>
              <strong>Essential cookies:</strong> Required for authentication, security, and core platform functionality.
            </li>
            <li>
              <strong>Preferences cookies:</strong> Remember your settings, such as theme and layout preferences.
            </li>
            <li>
              <strong>Analytics cookies:</strong> Help us understand how users interact with the platform so we can improve it.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            3. Third-Party Cookies
          </h2>
          <p className="mt-3">
            We may use third-party services (such as analytics providers) that set their own cookies. These services are bound by their own privacy policies and cookie practices.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            4. Managing Cookies
          </h2>
          <p className="mt-3">
            You can manage or disable cookies through your browser settings. Please note that disabling essential cookies may prevent you from using certain features of LiteMoov.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            5. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Cookie Policy from time to time. We encourage you to review this page periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            6. Contact Us
          </h2>
          <p className="mt-3">
            If you have questions about our use of cookies, please contact us at{" "}
            <a href="mailto:privacy@litemoov.com" className="text-violet-700 hover:underline">
              privacy@litemoov.com
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

