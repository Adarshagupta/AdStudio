import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { prisma } from "@/lib/db";

const preferencesSchema = z.object({
  marketingEnabled: z.boolean(),
  adsEnabled: z.boolean(),
  remindersEnabled: z.boolean(),
  productUpdatesEnabled: z.boolean(),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preference = await prisma.emailPreference.upsert({
    where: { userId: currentUser.user.id },
    create: { userId: currentUser.user.id },
    update: {},
  });

  return NextResponse.json({ preference });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);
  const result = preferencesSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const preference = await prisma.emailPreference.upsert({
    where: { userId: currentUser.user.id },
    create: {
      userId: currentUser.user.id,
      ...result.data,
    },
    update: result.data,
  });

  return NextResponse.json({ preference });
}
