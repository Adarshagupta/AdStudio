import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getRequestOrigin } from "@/lib/integrations/app-url";
import { sendVerificationEmail } from "@/lib/email/service";
import { parseRequestJson } from "@/lib/http/json";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await parseRequestJson(request);
  const result = resendSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email.toLowerCase() },
  });

  if (user && user.isActive && !user.emailVerifiedAt) {
    try {
      await sendVerificationEmail(user.id, undefined, getRequestOrigin(request));
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Verification email could not be sent: ${error.message}`
              : "Verification email could not be sent.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
