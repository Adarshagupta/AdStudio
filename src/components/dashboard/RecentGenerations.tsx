import { RecentGrid } from "@/components/dashboard/RecentGrid";
import { prisma } from "@/lib/db";
import { toGenerationListItem } from "@/lib/generation-types";

export async function RecentGenerations({ workspaceId }: { workspaceId: string }) {
  const generations = await prisma.generation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return <RecentGrid generations={generations.map(toGenerationListItem)} />;
}
