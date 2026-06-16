import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { deductCreditsWithGeneration, isBillingCreditsError } from "@/lib/billing/credits";
import { generateImage, generateAudio, generateScript } from "@/lib/cloudflare-ai";
import { buildDashboardImagePrompt, enrichPromptWithProductContext } from "@/lib/dashboard-generation";
import { parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";
import { resolveProductContextSafe } from "@/lib/product-research";
import { startVideoGeneration } from "@/lib/video-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const cost = 1;

  try {
    const { creditsRemaining, result: updated } = await deductCreditsWithGeneration(
      currentUser.workspace.id,
      cost,
      async (tx) => {
      const generation = await tx.generation.create({
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

      try {
        const thinking: string[] = [];
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

        thinking.push(`Analyzed: aspect ratio ${inferredAspectRatio}, duration ${inferredDuration}s, tone ${inferredTone}`);
        thinking.push(`Selected image model: ${imageModel}`);
        thinking.push(`Selected video model: ${videoModel}`);

        const productContext = productUrl?.trim()
          ? await resolveProductContextSafe(productUrl)
          : undefined;
        if (productContext) {
          thinking.push(`Product context prepared for ${productUrl}`);
        }

        const enrichedPrompt = enrichPromptWithProductContext(prompt, productContext);

        const scriptText = await generateScript({
          prompt: enrichedPrompt,
          format: "UGC",
          productUrl,
          productContext,
        });
        thinking.push("Script generated");

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void audioUrl;

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

        return await tx.generation.update({
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
      } catch (error) {
        return await tx.generation.update({
          where: { id: generation.id },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Agent generation failed.",
          },
        });
      }
    },
    );

    if (updated.status === "FAILED") {
      return NextResponse.json(
        { error: updated.errorMessage || "Agent generation failed." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      generationId: updated.id,
      status: updated.status,
      videoUrl: updated.videoUrl,
      thumbnailUrl: updated.thumbnailUrl,
      scriptText: updated.scriptText,
      xaiRequestId: updated.xaiRequestId,
      creditsRemaining,
    });
  } catch (error) {
    if (isBillingCreditsError(error)) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }
}
