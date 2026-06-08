import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateCharacterProfile } from "@/lib/cloudflare-ai";
import { parseRequestJson } from "@/lib/http/json";
import { truncateTextPrompt } from "@/lib/text-prompt";

const characterSchema = z.object({
  characterName: z.string().optional(),
  prompt: z.string().optional(),
  context: z.string().optional(),
  model: z.string().optional(),
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

  const result = characterSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await generateCharacterProfile({
      ...result.data,
      prompt: result.data.prompt ? truncateTextPrompt(result.data.prompt) : undefined,
      context: result.data.context ? truncateTextPrompt(result.data.context) : undefined,
    });
    return NextResponse.json({ output: profile, scriptText: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Character generation failed." },
      { status: 502 },
    );
  }
}
