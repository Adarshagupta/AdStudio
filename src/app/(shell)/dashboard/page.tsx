import { Suspense } from "react";

import { CursorGlow } from "@/components/dashboard/CursorGlow";
import { DashboardStudioProPromo } from "@/components/dashboard/DashboardStudioProPromo";
import { DashboardWelcomeCredits } from "@/components/dashboard/DashboardWelcomeCredits";
import { FloatingInspirationWidget } from "@/components/dashboard/FloatingInspirationWidget";
import { RecentGenerations } from "@/components/dashboard/RecentGenerations";
import { RecentGridSkeleton } from "@/components/dashboard/RecentGridSkeleton";
import { AnimatedFormatCards } from "@/components/dashboard/AnimatedFormatCards";
import { HeroInput } from "@/components/dashboard/HeroInput";
import { currentUserCan, getShellUser } from "@/lib/auth";
import { getWorkspaceWelcomeStatus } from "@/lib/billing/welcome-credits";
import { formatCards } from "@/lib/formats";

export default async function DashboardPage() {
  const currentUser = await getShellUser();
  const welcomeStatus = await getWorkspaceWelcomeStatus(currentUser.workspace.id);

  return (
    <div className="relative space-y-12">
      <CursorGlow />
      <FloatingInspirationWidget />
      <HeroInput canCreate={currentUserCan(currentUser, "createContent")} />
      <AnimatedFormatCards formatCards={formatCards} />
      <Suspense fallback={<RecentGridSkeleton />}>
        <RecentGenerations workspaceId={currentUser.workspace.id} />
      </Suspense>
      <DashboardWelcomeCredits
        initialStatus={welcomeStatus}
        isAdmin={currentUser.user.role === "ADMIN"}
      />
      <DashboardStudioProPromo />
    </div>
  );
}
