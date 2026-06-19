import { Suspense } from "react";

import { BillingCheckoutNotice } from "@/components/settings/BillingCheckoutNotice";
import { CurrentSubscriptionPanel } from "@/components/settings/CurrentSubscriptionPanel";
import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";
import type { SubscriptionPlanId } from "@/lib/billing/plans";
import { getWorkspaceBillingSummary } from "@/lib/billing/workspace-billing-summary";
import { getPrimaryBillingProvider, isPaidCheckoutEnabled, requiresPaidCheckout } from "@/lib/billing/payment-provider";
import { requireCurrentUser } from "@/lib/auth";

export default async function BillingSettingsPage() {
  const currentUser = await requireCurrentUser();
  const { workspace, user } = currentUser;
  const billingSummary = await getWorkspaceBillingSummary(workspace.id);

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <BillingCheckoutNotice />
      </Suspense>

      <div>
        <h1 className="text-xl font-medium">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your active plan, usage, and subscription details.
        </p>
      </div>

      <CurrentSubscriptionPanel
        summary={billingSummary}
        isAdmin={user.role === "ADMIN"}
        checkoutEnabled={isPaidCheckoutEnabled()}
        billingProvider={getPrimaryBillingProvider()}
      />

      <div>
        <h2 className="text-lg font-semibold text-foreground">Change plan</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Compare plans and upgrade or downgrade your workspace subscription.
        </p>
      </div>

      <SubscriptionPlans
        currentPlan={workspace.plan as SubscriptionPlanId}
        isAdmin={user.role === "ADMIN"}
        checkoutEnabled={isPaidCheckoutEnabled()}
        paidCheckoutRequired={requiresPaidCheckout()}
      />
    </div>
  );
}
