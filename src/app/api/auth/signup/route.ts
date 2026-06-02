import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/service";
import { allWorkspacePermissions } from "@/lib/permissions";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2),
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
  const body = await request.json();
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
        role: "ADMIN",
        permissions: allWorkspacePermissions,
        workspaceId: workspace.id,
        emailPreference: {
          create: {},
        },
      },
    });

    return { user, workspace };
  });

  try {
    await sendVerificationEmail(user.id);
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
}
