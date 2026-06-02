import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email.toLowerCase() },
  });

  if (!user?.passwordHash || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const isValid = await verifyPassword(result.data.password, user.passwordHash);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    try {
      await sendVerificationEmail(user.id);
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

  await createSession(user.id, user.workspaceId);

  return NextResponse.json({ ok: true });
}
