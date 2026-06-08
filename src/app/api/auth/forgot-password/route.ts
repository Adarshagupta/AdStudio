import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { parseRequestJson } from "@/lib/http/json";
import { sendPasswordResetEmail } from "@/lib/email/service";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await parseRequestJson(request);
  const result = forgotPasswordSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email.toLowerCase() },
  });

  if (user?.isActive) {
    try {
      await sendPasswordResetEmail(user, getRequestOrigin(request));
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Password reset email could not be sent: ${error.message}`
              : "Password reset email could not be sent.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
