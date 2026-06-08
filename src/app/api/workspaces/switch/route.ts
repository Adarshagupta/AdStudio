import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, switchWorkspace } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";

const switchSchema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);
  const result = switchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    await switchWorkspace(currentUser.user.id, result.data.workspaceId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not switch workspace." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, workspaceId: result.data.workspaceId });
}
