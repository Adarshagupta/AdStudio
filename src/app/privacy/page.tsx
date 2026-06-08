import { PublicPageLayout } from "@/components/layout/PublicPageLayout";

export default function PrivacyPage() {
  return (
    <PublicPageLayout
      title="Privacy Policy"
      description="How we collect, use, and protect your information."
    >
      <div className="mx-auto max-w-3xl space-y-10 px-5 text-sm leading-7 text-zinc-700 md:px-8 md:text-base">
        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            1. Information We Collect
          </h2>
          <p className="mt-3">
            We collect information you provide directly, such as your name, email address, and workspace details when you create an account. We also collect content you generate, including prompts, videos, images, and Studio Pro flows.
          </p>
          <p className="mt-3">
            Automatically, we collect usage data, device information, IP addresses, and cookies to improve our service and ensure security.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            2. How We Use Your Information
          </h2>
          <p className="mt-3">
            We use your information to provide and improve our services, process your generations, manage your workspace, send notifications, and communicate updates. We may also use aggregated data for analytics and product development.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            3. Data Sharing
          </h2>
          <p className="mt-3">
            We do not sell your personal information. We may share data with trusted service providers (e.g., AI model providers, cloud storage) who assist in operating our platform. We may also disclose information if required by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            4. Data Security
          </h2>
          <p className="mt-3">
            We implement industry-standard security measures including encryption, access controls, and regular audits. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            5. Your Rights
          </h2>
          <p className="mt-3">
            You can access, update, or delete your account information at any time. You may also request a copy of your data or ask us to delete it permanently. Contact us for assistance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            6. Cookies
          </h2>
          <p className="mt-3">
            We use cookies and similar technologies to authenticate users, remember preferences, and analyze usage. You can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            7. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the platform. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-zinc-900">
            8. Contact Us
          </h2>
          <p className="mt-3">
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@adstudio.com" className="text-violet-700 hover:underline">
              privacy@adstudio.com
            </a>
            .
          </p>
        </section>

        <p className="text-xs text-zinc-400">
          Last updated: June 2026
        </p>
      </div>
    </PublicPageLayout>
  );
}

export const metadata = {
  title: "Privacy Policy - Ad Studio",
  description: "How we collect, use, and protect your information at Ad Studio.",
};
