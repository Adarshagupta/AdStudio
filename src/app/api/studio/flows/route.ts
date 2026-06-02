import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { createStudioFlow, listStudioFlows } from "@/lib/studio-pro/flows";

const createSchema = z.object({
  name: z.string().trim().max(120).optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to Studio Pro." }, { status: 403 });
  }

  const flows = await listStudioFlows(currentUser.workspace.id);
  return NextResponse.json({ flows });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to create Studio Pro sessions." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const result = createSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const flow = await createStudioFlow(
    currentUser.workspace.id,
    currentUser.user.id,
    result.data.name,
  );

  return NextResponse.json(flow, { status: 201 });
}
