import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { checkCredits, deductCredits, InsufficientCreditsError, trackUsage } from "@/lib/billing/credits";
import { generateImage } from "@/lib/cloudflare-ai";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";
import { resolveModelBilling } from "@/lib/models";
import { backgroundUploadMedia, ensurePublicMediaUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const imageSchema = z.object({
  prompt: z.string().min(10),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  steps: z.number().min(1).max(50).optional(),
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  seed: z.number().optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to Studio Pro generation." }, { status: 403 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = imageSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const modelBilling = await resolveModelBilling(result.data.model ?? "", "image");
  const cost = modelBilling.cost;

  if (modelBilling.type === "premium") {
    try {
      await checkCredits(currentUser.workspace.id, cost);
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }
  }

  try {
    const image = await generateImage(result.data);
    console.log(`[studio/image] provider: ${image.provider}, url starts with: ${image.imageUrl?.slice(0, 30)}...`);

    if (image.provider?.startsWith("sylicaai/") && image.imageUrl?.startsWith("data:")) {
      backgroundUploadMedia({
        url: image.imageUrl,
        userId: currentUser.user.id,
        kind: "image",
      });
    }

    const imageUrl = image.provider?.startsWith("sylicaai/") && image.imageUrl?.startsWith("data:")
      ? image.imageUrl
      : await ensurePublicMediaUrl({
          url: image.imageUrl,
          userId: currentUser.user.id,
          kind: "image",
        });

    let creditsRemaining: number | undefined;

    if (modelBilling.type === "premium") {
      creditsRemaining = await deductCredits(currentUser.workspace.id, cost);
      await trackUsage(currentUser.workspace.id, { premiumCreditsUsed: cost });
    } else {
      // Uses included quota — deduct from image count
      await trackUsage(currentUser.workspace.id, { imageCountUsed: 1 });
      const workspace = await prisma.workspace.findUnique({
        where: { id: currentUser.workspace.id },
        select: { creditsRemaining: true },
      });
      creditsRemaining = workspace?.creditsRemaining ?? 0;
    }

    return NextResponse.json({
      imageUrl,
      provider: image.provider,
      notice: image.notice,
      creditsRemaining,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 502 },
    );
  }
}
