import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { approveWebLoginChallenge } from "@/lib/auth/qr-login";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";

const approveSchema = z.object({
  sessionId: z.string().min(1),
  secret: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Sign in on your phone first." }, { status: 401 });
    }

    const body = await parseRequestJson(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = approveSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: formatValidationErrors(result.error.flatten(), "Invalid QR approval.") },
        { status: 400 },
      );
    }

    await approveWebLoginChallenge(
      result.data.sessionId,
      result.data.secret,
      result.data.signature,
      currentUser.user.id,
      currentUser.workspace.id,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("QR approve failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not approve QR login." },
      { status: 400 },
    );
  }
}
