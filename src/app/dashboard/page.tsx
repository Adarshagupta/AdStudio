import { FormatCard } from "@/components/dashboard/FormatCard";
import { HeroInput } from "@/components/dashboard/HeroInput";
import { RecentGrid } from "@/components/dashboard/RecentGrid";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCards } from "@/lib/formats";
import { toGenerationListItem } from "@/lib/generation-types";

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const generations = await prisma.generation.findMany({
    where: { workspaceId: currentUser.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <ProtectedShell currentUser={currentUser}>
      <div className="space-y-12">
        <HeroInput canCreate={currentUserCan(currentUser, "createContent")} />
        <section className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {formatCards.map((format) => (
              <FormatCard key={format.slug} format={format} />
            ))}
          </div>
        </section>
        <RecentGrid generations={generations.map(toGenerationListItem)} />
      </div>
    </ProtectedShell>
  );
}
