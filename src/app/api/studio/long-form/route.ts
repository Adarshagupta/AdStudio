import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import { getAppUrl } from "@/lib/integrations/app-url";
import {
  createLongFormVideoJob,
  getLongFormVideo,
  renderLongFormVideo,
} from "@/lib/studio-pro/long-form";
import { enqueueLongFormRenderJob } from "@/lib/studio-pro/long-form-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const clipSchema = z.object({
  nodeId: z.string().optional(),
  generationId: z.string().optional(),
  title: z.string().trim().max(120).optional(),
  prompt: z.string().trim().max(4000).optional(),
  videoUrl: z.string().url(),
  durationSec: z.number().int().positive().optional(),
});

const longFormSchema = z.object({
  flowId: z.string().optional(),
  title: z.string().trim().max(120).optional(),
  prompt: z.string().trim().max(4000).optional(),
  targetDurationSec: z.number().int().positive().optional(),
  settings: z
    .object({
      resolution: z.string().optional(),
      aspectRatio: z.string().optional(),
      fps: z.number().int().positive().max(60).optional(),
      source: z.literal("studio-pro").optional(),
    })
    .optional(),
  clips: z.array(clipSchema).min(2, "Add at least two completed video clips.").max(60),
});

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

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create Studio Pro exports." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = longFormSchema.safeParse(body);
  if (!result.success) {
    const flattened = result.error.flatten();
    return NextResponse.json(
      {
        error: formatValidationErrors(flattened, "Invalid long-form export request."),
        errors: flattened,
      },
      { status: 400 },
    );
  }

  if (result.data.flowId) {
    const flow = await prisma.studioFlow.findFirst({
      where: {
        id: result.data.flowId,
        workspaceId: currentUser.workspace.id,
      },
      select: { id: true },
    });

    if (!flow) {
      return NextResponse.json({ error: "Studio flow not found." }, { status: 404 });
    }
  }

  const job = await createLongFormVideoJob({
    userId: currentUser.user.id,
    workspaceId: currentUser.workspace.id,
    studioFlowId: result.data.flowId,
    title: result.data.title,
    prompt: result.data.prompt,
    targetDurationSec: result.data.targetDurationSec,
    settings: { ...result.data.settings, source: "studio-pro" },
    clips: result.data.clips,
  });

  const queued = await enqueueLongFormRenderJob({
    jobId: job.id,
    origin: getAppUrl(request),
  });

  if (queued) {
    return NextResponse.json({ job: serializeJob(job), queued: true }, { status: 202 });
  }

  try {
    const rendered = await renderLongFormVideo(job.id, { requestOrOrigin: request });
    return NextResponse.json({ job: serializeJob(rendered) });
  } catch (error) {
    const failed = await getLongFormVideo(job.id);
    const message = error instanceof Error ? error.message : "Long-form export failed.";
    return NextResponse.json(
      {
        error: message,
        job: failed ? serializeJob(failed) : serializeJob(job),
      },
      { status: 500 },
    );
  }
}
