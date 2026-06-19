import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/lib/auth";
import { consumeWebLoginChallenge } from "@/lib/auth/qr-login";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import { isWorkspaceOnboardingCompleteCached } from "@/lib/onboarding-gate";
import { findUserById } from "@/lib/user-db";

const completeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseRequestJson(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = completeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: formatValidationErrors(result.error.flatten(), "Invalid QR session.") },
        { status: 400 },
      );
    }

    const challenge = await consumeWebLoginChallenge(result.data.sessionId);
    if (challenge.status !== "consumed") {
      return NextResponse.json(
        { error: "Waiting for mobile approval.", status: challenge.status },
        { status: 409 },
      );
    }

    const user = await findUserById(challenge.userId!);
    if (!user?.isActive || !user.emailVerifiedAt) {
      return NextResponse.json({ error: "Account is not eligible for QR login." }, { status: 403 });
    }

    const token = await createSession(challenge.userId!, challenge.workspaceId!);
    const onboardingComplete = await isWorkspaceOnboardingCompleteCached(challenge.workspaceId!);

    return NextResponse.json({
      ok: true,
      token,
      onboardingComplete,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("QR complete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not complete QR login." },
      { status: 400 },
    );
  }
}
