import { Suspense } from "react";

import { BillingCheckoutNotice } from "@/components/settings/BillingCheckoutNotice";
import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";
import type { SubscriptionPlanId } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { requireCurrentUser } from "@/lib/auth";

export default async function BillingSettingsPage() {
  const currentUser = await requireCurrentUser();
  const { workspace, user } = currentUser;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <BillingCheckoutNotice />
      </Suspense>
      <div>
        <h1 className="text-xl font-medium">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Choose a plan for your workspace. Paid upgrades are processed securely through Stripe Checkout.
        </p>
      </div>

      <SubscriptionPlans
        currentPlan={workspace.plan as SubscriptionPlanId}
        creditsRemaining={workspace.creditsRemaining}
        isAdmin={user.role === "ADMIN"}
        stripeEnabled={isStripeConfigured()}
      />
    </div>
  );
}
