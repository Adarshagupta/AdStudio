import { Suspense } from "react";

import { CursorGlow } from "@/components/dashboard/CursorGlow";
import { DashboardStudioProPromo } from "@/components/dashboard/DashboardStudioProPromo";
import { ProFreeTrialPopup } from "@/components/billing/ProFreeTrialPopup";
import { FloatingInspirationWidget } from "@/components/dashboard/FloatingInspirationWidget";
import { RecentGenerations } from "@/components/dashboard/RecentGenerations";
import { RecentGridSkeleton } from "@/components/dashboard/RecentGridSkeleton";
import { DashboardInspirationLayout } from "@/components/dashboard/DashboardInspirationLayout";
import { HeroInput } from "@/components/dashboard/HeroInput";
import { currentUserCan, getShellUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/billing/stripe";

export default async function DashboardPage() {
  const currentUser = await getShellUser();

  return (
    <div className="relative space-y-12">
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
        hasStripeSubscription={Boolean(currentUser.workspace.stripeSubscriptionId)}
        stripeEnabled={isStripeConfigured()}
      />
      <DashboardStudioProPromo />
    </div>
  );
}
