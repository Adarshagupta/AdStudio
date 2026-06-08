import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateAudio } from "@/lib/cloudflare-ai";
import { parseRequestJson } from "@/lib/http/json";

const audioSchema = z.object({
  prompt: z.string().min(3),
  model: z.string().optional(),
  lang: z.string().optional(),
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

  const result = audioSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const audio = await generateAudio(result.data);
    return NextResponse.json(audio);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio generation failed." },
      { status: 502 },
    );
  }
}
