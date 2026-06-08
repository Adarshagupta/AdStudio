import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getLongFormVideo } from "@/lib/studio-pro/long-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

function serializeJob(job: NonNullable<Awaited<ReturnType<typeof getLongFormVideo>>>) {
  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    segments: job.segments.map((segment) => ({
      ...segment,
      createdAt: segment.createdAt.toISOString(),
      startedAt: segment.startedAt?.toISOString() ?? null,
      completedAt: segment.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await getLongFormVideo(params.id);
  if (!job || job.workspaceId !== currentUser.workspace.id) {
    return NextResponse.json({ error: "Long-form export not found." }, { status: 404 });
  }

  if (job.userId !== currentUser.user.id && !currentUserCan(currentUser, "viewLibrary")) {
    return NextResponse.json({ error: "You do not have access to this export." }, { status: 403 });
  }

  return NextResponse.json({ job: serializeJob(job) });
}
