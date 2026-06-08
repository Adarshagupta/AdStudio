import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, switchWorkspace } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { createWorkspaceForUser, listWorkspacesForUser } from "@/lib/workspace-members";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(80),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await listWorkspacesForUser(currentUser.user.id);

  return NextResponse.json({
    activeWorkspaceId: currentUser.workspace.id,
    workspaces,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);
  const result = createWorkspaceSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const workspace = await createWorkspaceForUser(currentUser.user.id, result.data.name);
    await switchWorkspace(currentUser.user.id, workspace.id);

    return NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create workspace." },
      { status: 500 },
    );
  }
}
