import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, workspace } = currentUser;

  return NextResponse.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    lastWorkspaceId: user.lastWorkspaceId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.createdAt.toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      creditsRemaining: workspace.creditsRemaining,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.createdAt.toISOString(),
    },
  });
}
