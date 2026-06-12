import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { checkCredits, InsufficientCreditsError } from "@/lib/billing/credits";
import { parseRequestJson } from "@/lib/http/json";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  imageUrl: z.string().url().optional(),
});

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

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

  // Check if Remove.bg API key is configured
  if (!REMOVE_BG_API_KEY) {
    return NextResponse.json(
      { error: "Background removal is not configured. Add REMOVE_BG_API_KEY to your environment variables." },
      { status: 503 }
    );
  }

  try {
    // Deduct credits for background removal (cost: 1 credit)
    const cost = 1;
    try {
      await checkCredits(currentUser.workspace.id, cost);
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }

    // For now, return a placeholder indicating the feature needs configuration
    // In production, this would call the Remove.bg API or similar
    return NextResponse.json(
      { error: "Background removal requires a third-party API. Configure REMOVE_BG_API_KEY or use a service like remove.bg" },
      { status: 503 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Background removal failed." },
      { status: 502 }
    );
  }
}
