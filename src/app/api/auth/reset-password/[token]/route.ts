import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { prisma } from "@/lib/db";
import { hashEmailToken } from "@/lib/email/tokens";

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

type RouteContext = {
  params: { token: string };
};

export async function POST(request: Request, context: RouteContext) {
  const body = await parseRequestJson(request);
  const result = resetPasswordSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const token = await prisma.emailToken.findUnique({
    where: { tokenHash: hashEmailToken(context.params.token) },
    include: { user: true },
  });

  if (
    !token ||
    token.type !== "PASSWORD_RESET" ||
    token.usedAt ||
    token.expiresAt < new Date() ||
    !token.user.isActive
  ) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 410 });
  }

  const passwordHash = await hashPassword(result.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
        emailVerifiedAt: token.user.emailVerifiedAt ?? new Date(),
      },
    }),
    prisma.emailToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: token.userId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
