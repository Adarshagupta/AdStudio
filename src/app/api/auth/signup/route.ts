import { NextResponse } from "next/server";
import { z } from "zod";

import { cookies } from "next/headers";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  databaseSetupErrorMessage,
  isDatabaseSetupError,
} from "@/lib/prisma-errors";
import { sendVerificationEmail } from "@/lib/email/service";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { parseRequestJson } from "@/lib/http/json";
import { readReferralCodeFromCookie } from "@/lib/referral/codes";
import { attachReferralOnUserCreate } from "@/lib/referral/program";
import { allWorkspacePermissions } from "@/lib/permissions";

const signupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(8),
  workspaceName: z.string().trim().min(2),
  referralCode: z.string().trim().optional(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestJson(request);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: result.data.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const baseSlug = slugify(result.data.workspaceName) || "workspace";
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    const passwordHash = await hashPassword(result.data.password);

    const referralCode =
      readReferralCodeFromCookie(cookies().get("litemoov_ref")?.value) ??
      (result.data.referralCode ? readReferralCodeFromCookie(result.data.referralCode) : null);

    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: result.data.workspaceName,
          slug,
        },
      });
      const user = await tx.user.create({
        data: {
          email: result.data.email.toLowerCase(),
          name: result.data.name,
          passwordHash,
          lastWorkspaceId: workspace.id,
          emailPreference: {
            create: {},
          },
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "ADMIN",
          permissions: allWorkspacePermissions,
        },
      });

      await attachReferralOnUserCreate(tx, {
        userId: user.id,
        email: user.email,
        referralCode,
      });

      return { user, workspace };
    });

    try {
      await sendVerificationEmail(user.id, workspace.name, getRequestOrigin(request));
    } catch (error) {
      return NextResponse.json(
        {
          ok: true,
          requiresVerification: true,
          emailError: error instanceof Error ? error.message : "Verification email failed.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ ok: true, requiresVerification: true, workspaceId: workspace.id });
  } catch (error) {
    console.error("Signup failed:", error);

    if (isDatabaseSetupError(error)) {
      return NextResponse.json(
        { error: databaseSetupErrorMessage(error) },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Could not create account. Try again.";

    if (message.includes("Transactions are not supported")) {
      return NextResponse.json(
        { error: "Database configuration error. Please try again in a moment." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
