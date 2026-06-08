import type { GenerationFormat, Prisma } from "@prisma/client";

import { FilterBar } from "@/components/library/FilterBar";
import { VideoGrid } from "@/components/library/VideoGrid";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toGenerationListItem } from "@/lib/generation-types";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string; from?: string; to?: string };
}) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "viewLibrary")) {
    return (
      <AccessDenied
          title="Library access unavailable"
          message="Ask a workspace admin to enable library access for your account."
        />
      );
  }

  const where: Prisma.GenerationWhereInput = {
    workspaceId: currentUser.workspace.id,
  };

  if (isGenerationFormat(searchParams.type)) {
    where.format = searchParams.type;
  }

  if (searchParams.q) {
    where.OR = [
      { prompt: { contains: searchParams.q, mode: "insensitive" } },
      { scriptText: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  if (searchParams.from || searchParams.to) {
    where.createdAt = {
      gte: searchParams.from ? new Date(searchParams.from) : undefined,
      lte: searchParams.to ? new Date(searchParams.to) : undefined,
    };
  }

  const generations = await prisma.generation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Library</h1>
          <p className="text-sm text-muted-foreground">
            Search, review, and reuse generated ad assets.
          </p>
        </div>
        <FilterBar
          selectedType={searchParams.type ?? "all"}
          query={searchParams.q ?? ""}
          from={searchParams.from ?? ""}
          to={searchParams.to ?? ""}
        />
        <VideoGrid items={generations.map(toGenerationListItem)} />
      </div>
    );
}

function isGenerationFormat(value?: string): value is GenerationFormat {
  return value === "UGC" || value === "BRAIN_ROT" || value === "STATIC" || value === "REVIEW";
}
