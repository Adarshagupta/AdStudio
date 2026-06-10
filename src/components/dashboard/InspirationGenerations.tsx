import { prisma } from "@/lib/db";
import { toGenerationListItem } from "@/lib/generation-types";

export async function fetchInspirationGenerations() {
  const generations = await prisma.generation.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { thumbnailUrl: { not: null } },
        { videoUrl: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return generations.map(toGenerationListItem);
}
