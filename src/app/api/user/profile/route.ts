import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = patchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: currentUser.user.id },
    data: { name: result.data.name },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ name: user.name, email: user.email });
}
