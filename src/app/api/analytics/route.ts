import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "viewAnalytics")) {
    return NextResponse.json({ error: "You do not have access to analytics." }, { status: 403 });
  }

  const [videosGenerated, teamMembers, recentGenerations] = await Promise.all([
    prisma.generation.count({ where: { workspaceId: currentUser.workspace.id } }),
    prisma.user.count({ where: { workspaceId: currentUser.workspace.id, isActive: true } }),
    prisma.generation.findMany({
      where: { workspaceId: currentUser.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    metrics: {
      videosGenerated,
      teamMembers,
      creditsRemaining: currentUser.workspace.creditsRemaining,
      plan: currentUser.workspace.plan,
    },
    recentGenerations,
  });
}
