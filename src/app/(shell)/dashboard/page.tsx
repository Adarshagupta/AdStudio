import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { CursorGlow } from "@/components/dashboard/CursorGlow";
import { DashboardStudioProPromo } from "@/components/dashboard/DashboardStudioProPromo";
import { ProFreeTrialPopup } from "@/components/billing/ProFreeTrialPopup";
import { FloatingInspirationWidget } from "@/components/dashboard/FloatingInspirationWidget";
import { RecentGenerations } from "@/components/dashboard/RecentGenerations";
import { RecentGridSkeleton } from "@/components/dashboard/RecentGridSkeleton";
import { DashboardInspirationLayout } from "@/components/dashboard/DashboardInspirationLayout";
import { HeroInput, DASHBOARD_FLOATING_PROMPT_PADDING } from "@/components/dashboard/HeroInput";
import { currentUserCan, getShellUser } from "@/lib/auth";
import { isPaidCheckoutEnabled, requiresPaidCheckout } from "@/lib/billing/payment-provider";

export default async function DashboardPage() {
  const currentUser = await getShellUser();

  return (
    <div className={cn("relative space-y-10", DASHBOARD_FLOATING_PROMPT_PADDING)}>
      <CursorGlow />
      <FloatingInspirationWidget />
      <HeroInput canCreate={currentUserCan(currentUser, "createContent")} />
      <DashboardInspirationLayout />
      <Suspense fallback={<RecentGridSkeleton />}>
        <RecentGenerations workspaceId={currentUser.workspace.id} />
      </Suspense>
      <ProFreeTrialPopup
        plan={currentUser.workspace.plan}
        isAdmin={currentUser.user.role === "ADMIN"}
        hasPaidSubscription={Boolean(
          currentUser.workspace.stripeSubscriptionId || currentUser.workspace.dodoSubscriptionId,
        )}
        checkoutEnabled={isPaidCheckoutEnabled()}
        paidCheckoutRequired={requiresPaidCheckout()}
      />
      <DashboardStudioProPromo />
    </div>
  );
}
