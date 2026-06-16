import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { deductCredits, isBillingCreditsError, trackUsage } from "@/lib/billing/credits";
import { generateImage } from "@/lib/cloudflare-ai";
import { parseRequestJson } from "@/lib/http/json";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  imageUrl: z.string().url().optional(),
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  prompt: z.string().optional(),
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

  const { width, height, prompt } = result.data;

  try {
    const cost = 1;
    const creditsRemaining = await deductCredits(currentUser.workspace.id, cost);

    const expandPrompt = prompt?.trim()
      ? `Expand this image to ${width}x${height}: ${prompt}`
      : `Expand this image to ${width}x${height} pixels, maintaining the same style and content seamlessly.`;

    const image = await generateImage({
      prompt: expandPrompt,
      model: "sylicaai/flux-schnell",
      width: width ?? 1024,
      height: height ?? 1024,
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

    await trackUsage(currentUser.workspace.id, { premiumCreditsUsed: cost });

    return NextResponse.json({
      imageUrl,
      provider: image.provider,
      creditsRemaining,
    });
  } catch (error) {
    if (isBillingCreditsError(error)) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Expand failed." },
      { status: 502 }
    );
  }
}
