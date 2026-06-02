import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { generateScript } from "@/lib/cloudflare-ai";

const scriptSchema = z.object({
  format: z.enum(["UGC", "BRAIN_ROT", "STATIC", "REVIEW"]),
  prompt: z.string().min(10),
  productUrl: z.string().url().optional().or(z.literal("")),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to generate scripts." }, { status: 403 });
  }

  const body = await request.json();
  const result = scriptSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const scriptText = await generateScript({
      prompt: result.data.prompt,
      format: result.data.format,
      productUrl: result.data.productUrl || undefined,
      model: result.data.model,
    });

    return NextResponse.json({ scriptText });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Script generation failed." },
      { status: 502 },
    );
  }
}
