import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { checkCredits, deductCredits, InsufficientCreditsError, trackUsage } from "@/lib/billing/credits";
import { generateImage } from "@/lib/cloudflare-ai";
import { parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  imageUrl: z.string().url().optional(),
  maskUrl: z.string().url().optional(),
  prompt: z.string().min(1),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to Studio Pro editing." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const { prompt } = result.data;

  try {
    const cost = 1;
    try {
      await checkCredits(currentUser.workspace.id, cost);
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }

    // Use image generation to create the replacement
    const replacePrompt = `Replace the masked area in this image with: ${prompt}`;

    const image = await generateImage({
      prompt: replacePrompt,
      model: "sylicaai/flux-schnell",
      steps: 20,
    });

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

    const creditsRemaining = await deductCredits(currentUser.workspace.id, cost);
    await trackUsage(currentUser.workspace.id, { premiumCreditsUsed: cost });

    return NextResponse.json({
      imageUrl,
      provider: image.provider,
      creditsRemaining,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Replace failed." },
      { status: 502 }
    );
  }
}
