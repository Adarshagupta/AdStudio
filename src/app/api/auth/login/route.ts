import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, verifyPassword } from "@/lib/auth";
import {
  databaseSetupErrorMessage,
  isDatabaseSetupError,
} from "@/lib/prisma-errors";
import { sendVerificationEmail } from "@/lib/email/service";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import { isWorkspaceOnboardingCompleteCached } from "@/lib/onboarding-gate";
import { findUserByEmail } from "@/lib/user-db";
import { getDefaultWorkspaceIdForUser } from "@/lib/workspace-members";

const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseRequestJson(request);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: formatValidationErrors(result.error.flatten(), "Invalid login details."),
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(result.data.email);

    if (!user?.isActive) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: "This account uses Google sign-in. Continue with Google instead.",
          useGoogle: true,
        },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(result.data.password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.emailVerifiedAt) {
      try {
        await sendVerificationEmail(user.id, undefined, getRequestOrigin(request));
      } catch {
        // Keep the response generic; the user can request another verification email.
      }

      return NextResponse.json(
        {
          error: "Verify your email before signing in. We sent a new verification link.",
          requiresVerification: true,
        },
        { status: 403 },
      );
    }

    const workspaceId = await getDefaultWorkspaceIdForUser(user.id);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace access found for this account. Accept a workspace invite first." },
        { status: 403 },
      );
    }

    const token = await createSession(user.id, workspaceId);

    const onboardingComplete = await isWorkspaceOnboardingCompleteCached(workspaceId);

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
    console.error("Login failed:", error);

    if (isDatabaseSetupError(error)) {
      return NextResponse.json(
        { error: databaseSetupErrorMessage(error) },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed. Try again." },
      { status: 500 },
    );
  }
}
