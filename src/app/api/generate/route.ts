import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateImage, generateScript } from "@/lib/cloudflare-ai";
import { buildDashboardImagePrompt } from "@/lib/dashboard-generation";
import { prisma } from "@/lib/db";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl, ensurePublicMediaUrls } from "@/lib/media-url";
import { startVideoGeneration } from "@/lib/video-generation";

export const runtime = "nodejs";
export const maxDuration = 60;

const generateSchema = z
  .object({
    outputType: z.enum(["video", "image"]).default("video"),
    format: z.enum(["UGC", "BRAIN_ROT", "STATIC", "REVIEW"]),
    prompt: z.string().trim(),
    productUrl: z.string().url().optional().or(z.literal("")),
    avatarId: z.string().optional().nullable(),
    scriptText: z.string().optional(),
    adhereToScript: z.boolean().optional(),
    shotNotes: z.string().optional(),
    referenceImageUrl: z.string().url().optional(),
    referenceImageUrls: z.array(z.string().url()).optional(),
    referenceVideoUrl: z.string().url().optional(),
    videoOperation: z.enum(["auto", "edit", "extend", "control"]).optional(),
    model: z.string().optional(),
    style: z
      .object({
        aspectRatio: z.string().optional(),
        captionStyle: z.string().optional(),
        musicEnabled: z.boolean().optional(),
        duration: z.number().optional(),
        resolution: z.string().optional(),
        outputType: z.enum(["video", "image"]).optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasReference = Boolean(
      data.referenceImageUrl || (data.referenceImageUrls && data.referenceImageUrls.length > 0),
    );

    if (data.prompt.length < 3 && !hasReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a short prompt (3+ characters) or upload a reference image.",
        path: ["prompt"],
      });
    }
  });

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create generations." }, { status: 403 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = generateSchema.safeParse(body);

  if (!result.success) {
    const flattened = result.error.flatten();
    return NextResponse.json(
      {
        error: formatValidationErrors(flattened, "Invalid generation request."),
        errors: flattened,
      },
      { status: 400 },
    );
  }

  if (currentUser.workspace.creditsRemaining <= 0) {
    return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
  }

  const outputType = result.data.outputType;
  const prompt =
    result.data.prompt ||
    (result.data.referenceImageUrl ? "Create a short ad based on the reference image." : "");
  const style = {
    ...(result.data.style ?? {}),
    outputType,
  };

  if (outputType === "image") {
    const generation = await prisma.generation.create({
      data: {
        workspaceId: currentUser.workspace.id,
        userId: currentUser.user.id,
        format: "STATIC",
        status: "PROCESSING",
        prompt,
        productUrl: result.data.productUrl || null,
        avatarId: result.data.avatarId || null,
        style,
        startedAt: new Date(),
      },
    });

    try {
      const imagePrompt = buildDashboardImagePrompt(prompt, result.data.referenceImageUrl);
      const image = await generateImage({
        prompt: imagePrompt,
        model: result.data.model,
        aspectRatio: result.data.style?.aspectRatio,
      });

      // For SylicaAI base64 images: return immediately, upload to R2 in background
      let imageUrl: string;
      if (image.provider?.startsWith("sylicaai/") && image.imageUrl?.startsWith("data:")) {
        backgroundUploadMedia({
          url: image.imageUrl,
          userId: currentUser.user.id,
          kind: "image",
        });
        imageUrl = image.imageUrl;
      } else {
        imageUrl = await ensurePublicMediaUrl({
          url: image.imageUrl,
          userId: currentUser.user.id,
          kind: "image",
        });
      }

      const [, updatedGeneration] = await prisma.$transaction([
        prisma.workspace.update({
          where: { id: currentUser.workspace.id },
          data: { creditsRemaining: { decrement: 1 } },
        }),
        prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: "COMPLETED",
            thumbnailUrl: imageUrl,
            completedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        jobId: updatedGeneration.id,
        generationId: updatedGeneration.id,
        status: updatedGeneration.status,
        outputType: "image",
        imageUrl,
        thumbnailUrl: imageUrl,
        notice: image.notice,
      });
    } catch (error) {
      const failedGeneration = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Image generation failed.",
        },
      });

      return NextResponse.json(
        {
          jobId: failedGeneration.id,
          generationId: failedGeneration.id,
          status: failedGeneration.status,
          outputType: "image",
          error: failedGeneration.errorMessage,
        },
        { status: 502 },
      );
    }
  }

  let scriptText = result.data.scriptText?.trim();

  if (!scriptText) {
    try {
      scriptText = await generateScript({
        prompt,
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
      prompt,
      productUrl: result.data.productUrl || null,
      scriptText: finalScriptText,
      avatarId: result.data.avatarId || null,
      style,
    },
  });

  try {
    const referenceImageUrls = await ensurePublicMediaUrls(
      result.data.referenceImageUrls ??
        (result.data.referenceImageUrl ? [result.data.referenceImageUrl] : undefined),
      currentUser.user.id,
      "image",
    );
    const referenceImageUrl = referenceImageUrls[0];
    const referenceVideoUrl = result.data.referenceVideoUrl
      ? await ensurePublicMediaUrl({
          url: result.data.referenceVideoUrl,
          userId: currentUser.user.id,
          kind: "video",
        })
      : undefined;

    const video = await startVideoGeneration({
      prompt,
      scriptText: finalScriptText,
      format: result.data.format,
      model: result.data.model,
      adhereToScript:
        result.data.adhereToScript ?? Boolean(referenceImageUrl || referenceImageUrls.length > 0),
      shotNotes: result.data.shotNotes,
      referenceImageUrl,
      referenceImageUrls,
      referenceVideoUrl,
      videoOperation: result.data.videoOperation,
      style: result.data.style,
    });

    const [, updatedGeneration] = await prisma.$transaction([
      prisma.workspace.update({
        where: { id: currentUser.workspace.id },
        data: { creditsRemaining: { decrement: 1 } },
      }),
      prisma.generation.update({
        where: { id: generation.id },
        data: video.videoUrl
          ? {
              status: "COMPLETED",
              videoUrl: video.videoUrl,
              thumbnailUrl: referenceImageUrl ?? null,
              xaiRequestId: video.requestId,
              durationSec: video.duration,
              startedAt: new Date(),
              completedAt: new Date(),
            }
          : {
              status: "PROCESSING",
              xaiRequestId: video.requestId,
              durationSec: video.duration,
              thumbnailUrl: referenceImageUrl ?? null,
              startedAt: new Date(),
            },
      }),
    ]);

    return NextResponse.json({
      jobId: updatedGeneration.id,
      generationId: updatedGeneration.id,
      status: updatedGeneration.status,
      outputType: "video",
      scriptText: finalScriptText,
      videoUrl: updatedGeneration.videoUrl,
      thumbnailUrl: updatedGeneration.thumbnailUrl,
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
        outputType: "video",
        scriptText: finalScriptText,
        error: failedGeneration.errorMessage,
      },
      { status: 502 },
    );
  }
}
