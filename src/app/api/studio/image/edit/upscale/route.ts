import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  imageUrl: z.string().url().optional(),
  scale: z.number().min(1).max(4).default(2),
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

  try {
    return NextResponse.json(
      { error: "Upscale requires the current canvas image. Please export and upload the image first." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upscale failed." },
      { status: 502 }
    );
  }
}
