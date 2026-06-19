import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildQrPayload,
  createQrChallenge,
  encodeQrPayload,
} from "@/lib/auth/qr-login";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";

const initSchema = z.object({
  intent: z.enum(["web_login", "mobile_login"]),
});

export async function POST(request: Request) {
  try {
    const body = await parseRequestJson(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = initSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: formatValidationErrors(result.error.flatten(), "Invalid QR request.") },
        { status: 400 },
      );
    }

    const { intent } = result.data;

    if (intent === "mobile_login") {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "Sign in first to generate a mobile login QR." }, { status: 401 });
      }

      const challenge = await createQrChallenge(
        intent,
        currentUser.user.id,
        currentUser.workspace.id,
      );
      const origin = getRequestOrigin(request);
      const payload = buildQrPayload(origin, challenge);

      return NextResponse.json({
        sessionId: challenge.sessionId,
        qrPayload: encodeQrPayload(payload),
        expiresAt: challenge.expiresAt,
      });
    }

    const challenge = await createQrChallenge(intent);
    const origin = getRequestOrigin(request);
    const payload = buildQrPayload(origin, challenge);

    return NextResponse.json({
      sessionId: challenge.sessionId,
      qrPayload: encodeQrPayload(payload),
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    console.error("QR init failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start QR login." },
      { status: 500 },
    );
  }
}
