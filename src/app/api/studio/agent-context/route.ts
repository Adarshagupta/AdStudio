import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";
import { getWorkspaceOnboarding } from "@/lib/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  brandTone: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(),
  defaultAspectRatio: z.string().max(16).optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const onboarding = await getWorkspaceOnboarding(currentUser.workspace.id);
  const workspace = await prisma.workspace.findUnique({
    where: { id: currentUser.workspace.id },
    select: {
      name: true,
      agentBrandTone: true,
      agentTargetAudience: true,
      agentDefaultAspectRatio: true,
    },
  });

  return NextResponse.json({
    workspaceName: workspace?.name ?? currentUser.workspace.name,
    companyName: onboarding?.companyName ?? undefined,
    brandTone: workspace?.agentBrandTone ?? undefined,
    targetAudience: workspace?.agentTargetAudience ?? undefined,
    defaultAspectRatio: workspace?.agentDefaultAspectRatio ?? undefined,
  });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await prisma.workspace.update({
    where: { id: currentUser.workspace.id },
    data: {
      agentBrandTone: parsed.data.brandTone?.trim() || null,
      agentTargetAudience: parsed.data.targetAudience?.trim() || null,
      agentDefaultAspectRatio: parsed.data.defaultAspectRatio?.trim() || null,
    },
    select: {
      name: true,
      agentBrandTone: true,
      agentTargetAudience: true,
      agentDefaultAspectRatio: true,
    },
  });

  const onboarding = await getWorkspaceOnboarding(currentUser.workspace.id);

  return NextResponse.json({
    workspaceName: workspace.name,
    companyName: onboarding?.companyName ?? undefined,
    brandTone: workspace.agentBrandTone ?? undefined,
    targetAudience: workspace.agentTargetAudience ?? undefined,
    defaultAspectRatio: workspace.agentDefaultAspectRatio ?? undefined,
  });
}
