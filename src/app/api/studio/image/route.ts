import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateImage } from "@/lib/cloudflare-ai";
import { parseRequestJson } from "@/lib/http/json";
import { ensurePublicMediaUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const imageSchema = z.object({
  prompt: z.string().min(10),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
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

  try {
    const image = await generateImage(result.data);
    const imageUrl = await ensurePublicMediaUrl({
      url: image.imageUrl,
      userId: currentUser.user.id,
      kind: "image",
    });

    return NextResponse.json({
      imageUrl,
      provider: image.provider,
      notice: image.notice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 502 },
    );
  }
}
