import { notFound } from "next/navigation";

import { GenerationView } from "@/components/generations/GenerationView";
import { requireCurrentUser } from "@/lib/auth";
import { getGenerationOutputType } from "@/lib/dashboard-generation";
import { prisma } from "@/lib/db";

export default async function GenerationPage({ params }: { params: { id: string } }) {
  const currentUser = await requireCurrentUser();
  const generation = await prisma.generation.findFirst({
    where: {
      id: params.id,
      workspaceId: currentUser.workspace.id,
    },
  });

  if (!generation) {
    notFound();
  }

  return (
    <GenerationView
        generationId={generation.id}
        prompt={generation.prompt}
        format={generation.format}
        outputType={getGenerationOutputType(generation.style)}
        initialStatus={generation.status}
        initialScriptText={generation.scriptText}
        initialVideoUrl={generation.videoUrl}
        initialThumbnailUrl={generation.thumbnailUrl}
        initialError={generation.errorMessage}
      />
    );
}
