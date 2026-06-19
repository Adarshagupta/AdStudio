import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { deductCredits, isBillingCreditsError } from "@/lib/billing/credits";
import { generateImage, generateAudio, generateScript } from "@/lib/cloudflare-ai";
import { buildDashboardImagePrompt, enrichPromptWithProductContext } from "@/lib/dashboard-generation";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";
import { resolveProductContextForAgent } from "@/lib/product-research";
import { startVideoGeneration } from "@/lib/video-generation";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
  const productContextInput =
    typeof body.productContext === "string" ? body.productContext.trim() : undefined;
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

  const cost = 1;

  let creditsRemaining: number;
  try {
    creditsRemaining = await deductCredits(currentUser.workspace.id, cost);
  } catch (error) {
    if (isBillingCreditsError(error)) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
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
      // Padding helps proxies and Next.js flush the first SSE chunk promptly.
      controller.enqueue(encoder.encode(`: ${" ".repeat(2048)}\n\n`));

      function send(event: { step: string; status: string; payload?: Record<string, unknown> }) {
        controller.enqueue(encoder.encode(sseLine(event)));
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }

      try {
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

        const thinking: string[] = [];

        let productContext: string | undefined;
        if (productUrl?.trim()) {
          send({ step: "research", status: "running" });
          if (productContextInput) {
            productContext = productContextInput;
            thinking.push(`Using pre-researched product context for ${productUrl.trim()}`);
            send({
              step: "research",
              status: "completed",
              payload: { productContext, thinking, partial: false },
            });
          } else {
            productContext = await resolveProductContextForAgent(productUrl);
            const researched = productContext?.includes("Note:") ?? false;
            thinking.push(
              researched
                ? `Product research used fallback for ${productUrl.trim()}`
                : `Researched product page: ${productUrl.trim()}`,
            );
            send({
              step: "research",
              status: "completed",
              payload: { productContext, thinking, partial: researched },
            });
          }
        }

        send({ step: "think", status: "running" });

        thinking.push(
          `Analyzed: aspect ratio ${inferredAspectRatio}, duration ${inferredDuration}s, tone ${inferredTone}`,
          `Selected image model: ${imageModel}`,
          `Selected video model: ${videoModel}`,
        );

        const enrichedPrompt = enrichPromptWithProductContext(prompt, productContext);

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
          prompt: enrichedPrompt,
          format: "UGC",
          productUrl,
          productContext,
        });
        thinking.push("Script generated");
        send({ step: "script", status: "completed", payload: { scriptText, thinking } });

        // Step 2: Image
        send({ step: "image", status: "running" });
        const imagePrompt = buildDashboardImagePrompt(enrichedPrompt, referenceImageUrl, productContext);
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
          prompt: enrichedPrompt,
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

        const updated = await prisma.generation.update({
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
        });

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
            creditsRemaining,
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
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
