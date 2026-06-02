import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/service";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = resendSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email.toLowerCase() },
  });

  if (user && user.isActive && !user.emailVerifiedAt) {
    await sendVerificationEmail(user.id);
  }

  return NextResponse.json({ ok: true });
}
