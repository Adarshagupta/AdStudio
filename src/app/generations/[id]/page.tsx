import { notFound } from "next/navigation";

import { GenerationView } from "@/components/generations/GenerationView";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { requireCurrentUser } from "@/lib/auth";
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
    <ProtectedShell currentUser={currentUser}>
      <GenerationView
        generationId={generation.id}
        prompt={generation.prompt}
        format={generation.format}
        initialStatus={generation.status}
        initialScriptText={generation.scriptText}
        initialVideoUrl={generation.videoUrl}
        initialError={generation.errorMessage}
      />
    </ProtectedShell>
  );
}
