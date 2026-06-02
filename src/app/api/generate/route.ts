import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateScript, startVideoGeneration } from "@/lib/cloudflare-ai";

const generateSchema = z.object({
  format: z.enum(["UGC", "BRAIN_ROT", "STATIC", "REVIEW"]),
  prompt: z.string().min(10),
  productUrl: z.string().url().optional().or(z.literal("")),
  avatarId: z.string().optional().nullable(),
  scriptText: z.string().optional(),
  model: z.string().optional(),
  style: z
    .object({
      aspectRatio: z.string().optional(),
      captionStyle: z.string().optional(),
      musicEnabled: z.boolean().optional(),
      duration: z.number().optional(),
      resolution: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create generations." }, { status: 403 });
  }

  const body = await request.json();
  const result = generateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (currentUser.workspace.creditsRemaining <= 0) {
    return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
  }

  let scriptText = result.data.scriptText?.trim();

  if (!scriptText) {
    try {
      scriptText = await generateScript({
        prompt: result.data.prompt,
        format: result.data.format,
        productUrl: result.data.productUrl || undefined,
        model: result.data.model,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Script generation failed." },
        { status: 502 },
      );
    }
  }

  const finalScriptText = scriptText ?? "";

  const generation = await prisma.generation.create({
    data: {
      workspaceId: currentUser.workspace.id,
      userId: currentUser.user.id,
      format: result.data.format,
      status: "QUEUED",
      prompt: result.data.prompt,
      productUrl: result.data.productUrl || null,
      scriptText: finalScriptText,
      avatarId: result.data.avatarId || null,
      style: result.data.style ?? {},
    },
  });

  try {
    const video = await startVideoGeneration({
      prompt: result.data.prompt,
      scriptText: finalScriptText,
      format: result.data.format,
      model: result.data.model,
      style: result.data.style,
    });

    const updatedGeneration = await prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: currentUser.workspace.id },
        data: { creditsRemaining: { decrement: 1 } },
      });

      return tx.generation.update({
        where: { id: generation.id },
        data: video.videoUrl
          ? {
              status: "COMPLETED",
              videoUrl: video.videoUrl,
              xaiRequestId: video.requestId,
              durationSec: video.duration,
              startedAt: new Date(),
              completedAt: new Date(),
            }
          : {
              status: "PROCESSING",
              xaiRequestId: video.requestId,
              durationSec: video.duration,
              startedAt: new Date(),
            },
      });
    });

    return NextResponse.json({
      jobId: updatedGeneration.id,
      generationId: updatedGeneration.id,
      status: updatedGeneration.status,
      scriptText: finalScriptText,
      videoUrl: updatedGeneration.videoUrl,
      xaiRequestId: video.requestId,
    });
  } catch (error) {
    const failedGeneration = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Video generation failed.",
      },
    });

    return NextResponse.json(
      {
        jobId: failedGeneration.id,
        generationId: failedGeneration.id,
        status: failedGeneration.status,
        scriptText: finalScriptText,
        error: failedGeneration.errorMessage,
      },
      { status: 502 },
    );
  }
}
