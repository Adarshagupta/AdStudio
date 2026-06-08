import { Suspense } from "react";

import { DashboardStudioProPromo } from "@/components/dashboard/DashboardStudioProPromo";
import { DashboardWelcomeCredits } from "@/components/dashboard/DashboardWelcomeCredits";
import { RecentGenerations } from "@/components/dashboard/RecentGenerations";
import { RecentGridSkeleton } from "@/components/dashboard/RecentGridSkeleton";
import { FormatCard } from "@/components/dashboard/FormatCard";
import { HeroInput } from "@/components/dashboard/HeroInput";
import { currentUserCan, getShellUser } from "@/lib/auth";
import { getWorkspaceWelcomeStatus } from "@/lib/billing/welcome-credits";
import { formatCards } from "@/lib/formats";

export default async function DashboardPage() {
  const currentUser = await getShellUser();
  const welcomeStatus = await getWorkspaceWelcomeStatus(currentUser.workspace.id);

  return (
    <div className="space-y-12">
      <HeroInput canCreate={currentUserCan(currentUser, "createContent")} />
      <section className="space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {formatCards.map((format) => (
            <FormatCard key={format.slug} format={format} />
          ))}
        </div>
      </section>
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
