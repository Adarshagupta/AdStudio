import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ProFreeTrialPopup } from "@/components/billing/ProFreeTrialPopup";
import { getCurrentUser } from "@/lib/auth";
import { isPaidCheckoutEnabled, requiresPaidCheckout } from "@/lib/billing/payment-provider";
import { isDatabaseConfigured } from "@/lib/database-url";
import { getWorkspaceOnboarding, serializeOnboarding } from "@/lib/onboarding";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

function DatabaseSetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-zinc-900">Database not configured</h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          This app needs a Postgres connection string. Copy <code className="text-xs">.env.example</code> to{" "}
          <code className="text-xs">.env</code> and set <code className="text-xs">DATABASE_URL</code> from your Neon
          project, then restart <code className="text-xs">bun run dev</code>.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default async function OnboardingPage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupNotice />;
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const record = await getWorkspaceOnboarding(currentUser.workspace.id);
  const initial = serializeOnboarding(record, currentUser.workspace.name);

  if (initial.completed) {
    redirect("/dashboard");
  }

  return (
    <>
      <OnboardingWizard initial={initial} />
      <ProFreeTrialPopup
        plan={currentUser.workspace.plan}
        isAdmin={currentUser.user.role === "ADMIN"}
        hasPaidSubscription={Boolean(currentUser.workspace.stripeSubscriptionId || currentUser.workspace.dodoSubscriptionId)}
        checkoutEnabled={isPaidCheckoutEnabled()}
        paidCheckoutRequired={requiresPaidCheckout()}
        showDelayMs={900}
        surface="onboarding"
      />
    </>
  );
}
