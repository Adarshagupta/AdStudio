import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pollVideoGeneration } from "@/lib/cloudflare-ai";

export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generation = await prisma.generation.findFirst({
    where: {
      id: params.jobId,
      workspaceId: currentUser.workspace.id,
    },
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
  }

  if (generation.userId !== currentUser.user.id && !currentUserCan(currentUser, "viewLibrary")) {
    return NextResponse.json({ error: "You do not have access to this generation." }, { status: 403 });
  }

  if (!generation.xaiRequestId || generation.status === "COMPLETED" || generation.status === "FAILED") {
    return NextResponse.json(generation);
  }

  try {
    const status = await pollVideoGeneration(generation.xaiRequestId);

    if (status.status === "done" && status.videoUrl) {
      const completedAt = new Date();
      const updated = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          videoUrl: status.videoUrl,
          durationSec: status.durationSec ?? generation.durationSec,
          completedAt,
          renderTimeMs: generation.startedAt
            ? completedAt.getTime() - generation.startedAt.getTime()
            : null,
        },
      });

      return NextResponse.json(updated);
    }

    if (status.status === "failed" || status.status === "expired") {
      const updated = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          errorMessage: `Cloudflare video request ${status.status}.`,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(generation);
  } catch (error) {
    return NextResponse.json(
      { ...generation, errorMessage: error instanceof Error ? error.message : "Status polling failed." },
      { status: 502 },
    );
  }
}
