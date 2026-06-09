import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateImage, generateAudio, generateScript } from "@/lib/cloudflare-ai";
import { buildDashboardImagePrompt } from "@/lib/dashboard-generation";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";
import { startVideoGeneration } from "@/lib/video-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

function sseLine(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create content." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : "9:16";
  const productUrl = typeof body.productUrl === "string" ? body.productUrl : undefined;
  const referenceImageUrl = typeof body.referenceImageUrl === "string" ? body.referenceImageUrl : undefined;
  const referenceImageUrls = Array.isArray(body.referenceImageUrls)
    ? body.referenceImageUrls.filter((u): u is string => typeof u === "string")
    : referenceImageUrl
      ? [referenceImageUrl]
      : [];
  const imageModel = typeof body.imageModel === "string" ? body.imageModel : "openai/gpt-image-1";
  const videoModel = typeof body.videoModel === "string" ? body.videoModel : "openai/sora";

  if (prompt.length < 3 && !referenceImageUrl) {
    return NextResponse.json(
      { error: "Add a short prompt (3+ characters) or upload a reference image." },
      { status: 400 },
    );
  }

  if (currentUser.workspace.creditsRemaining <= 0) {
    return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
  }

  const generation = await prisma.generation.create({
    data: {
      workspaceId: currentUser.workspace.id,
      userId: currentUser.user.id,
      format: "UGC",
      status: "PROCESSING",
      prompt,
      productUrl: productUrl || null,
      style: {
        aspectRatio,
        duration: 10,
        resolution: "480p",
      },
      startedAt: new Date(),
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: { step: string; status: string; payload?: Record<string, unknown> }) {
        controller.enqueue(encoder.encode(sseLine(event)));
      }

      try {
        // Step 0: Think
        send({ step: "think", status: "running" });

        const lowerPrompt = prompt.toLowerCase();
        const inferredAspectRatio = lowerPrompt.includes("horizontal") || lowerPrompt.includes("landscape")
          ? "16:9"
          : lowerPrompt.includes("square")
            ? "1:1"
            : aspectRatio;

        const inferredDuration = lowerPrompt.includes("15s") || lowerPrompt.includes("15 sec")
          ? 15
          : lowerPrompt.includes("30s") || lowerPrompt.includes("30 sec")
            ? 30
            : 10;

        const inferredTone = lowerPrompt.includes("premium") || lowerPrompt.includes("luxury")
          ? "premium"
          : lowerPrompt.includes("funny") || lowerPrompt.includes("humor")
            ? "humorous"
            : "standard";

        const thinking: string[] = [
          `Analyzed: aspect ratio ${inferredAspectRatio}, duration ${inferredDuration}s, tone ${inferredTone}`,
          `Selected image model: ${imageModel}`,
          `Selected video model: ${videoModel}`,
        ];

        send({ step: "think", status: "completed", payload: { thinking, settings: {
          aspectRatio: inferredAspectRatio,
          duration: inferredDuration,
          tone: inferredTone,
          imageModel,
          videoModel,
        } } });

        // Step 1: Script
        send({ step: "script", status: "running" });
        const scriptText = await generateScript({
          prompt,
          format: "UGC",
          productUrl,
        });
        thinking.push("Script generated");
        send({ step: "script", status: "completed", payload: { scriptText, thinking } });

        // Step 2: Image
        send({ step: "image", status: "running" });
        const imagePrompt = buildDashboardImagePrompt(prompt, referenceImageUrl);
        const image = await generateImage({
          prompt: imagePrompt,
          model: imageModel,
          aspectRatio: inferredAspectRatio,
        });
        thinking.push(`Image generated with ${imageModel}`);

        let imageUrl = image.imageUrl;
        if (image.provider?.startsWith("sylicaai/") && image.imageUrl?.startsWith("data:")) {
          backgroundUploadMedia({
            url: image.imageUrl,
            userId: currentUser.user.id,
            kind: "image",
          });
        } else {
          imageUrl = await ensurePublicMediaUrl({
            url: image.imageUrl,
            userId: currentUser.user.id,
            kind: "image",
          });
        }
        send({ step: "image", status: "completed", payload: { imageUrl, thinking } });

        // Step 3: Audio
        send({ step: "audio", status: "running" });
        const audio = await generateAudio({
          prompt: scriptText,
          lang: "en",
        });
        thinking.push("Voiceover generated");
        const audioUrl = await ensurePublicMediaUrl({
          url: audio.audioUrl,
          userId: currentUser.user.id,
          kind: "audio",
        });
        send({ step: "audio", status: "completed", payload: { audioUrl, thinking } });

        // Step 4: Video
        send({ step: "video", status: "running" });
        const video = await startVideoGeneration({
          prompt,
          scriptText,
          format: "UGC",
          model: videoModel,
          style: {
            aspectRatio: inferredAspectRatio,
            duration: inferredDuration,
            resolution: "480p",
          },
          referenceImageUrl: imageUrl,
          referenceImageUrls,
          adhereToScript: true,
        });
        thinking.push(`Video generation started with ${videoModel}`);
        send({ step: "video", status: "completed", payload: { videoUrl: video.videoUrl, requestId: video.requestId, thinking } });

        const [, updated] = await prisma.$transaction([
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
                  thumbnailUrl: imageUrl ?? null,
                  scriptText,
                  xaiRequestId: video.requestId,
                  durationSec: video.duration,
                  completedAt: new Date(),
                }
              : {
                  status: "PROCESSING",
                  xaiRequestId: video.requestId,
                  durationSec: video.duration,
                  scriptText,
                  thumbnailUrl: imageUrl ?? null,
                },
          }),
        ]);

        send({
          step: "done",
          status: updated.status,
          payload: {
            generationId: updated.id,
            scriptText,
            imageUrl,
            audioUrl,
            videoUrl: video.videoUrl,
            requestId: video.requestId,
            notice: image.notice,
            thinking,
            settings: {
              aspectRatio: inferredAspectRatio,
              duration: inferredDuration,
              tone: inferredTone,
              imageModel,
              videoModel,
            },
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent generation failed.";
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: "FAILED",
            errorMessage: message,
          },
        });
        send({ step: "error", status: "failed", payload: { error: message } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
