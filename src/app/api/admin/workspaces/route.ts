import { NextResponse } from "next/server";

import {
  clampCreditsToPlanCap,
  maxWalletCreditsForWorkspace,
} from "@/lib/billing/credit-limits";
import { prisma } from "@/lib/db";

function verifyAdminSession(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("admin_session=");
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
          _count: {
            select: { generations: true, members: true },
          },
        },
      }),
      prisma.workspace.count(),
    ]);

    return NextResponse.json({ workspaces, total, page, limit });
  } catch {
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing workspace ID" }, { status: 400 });
    }

    const body = await request.json();
    const { plan, creditsRemaining, name } = body;

    const existing = await prisma.workspace.findUnique({
      where: { id },
      select: {
        plan: true,
        billingInterval: true,
        subscriptionStatus: true,
        welcomeCreditsClaimedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const nextPlan = (plan ?? existing.plan) as "FREE" | "STARTER" | "PRO" | "BUSINESS";
    const maxCredits = maxWalletCreditsForWorkspace({
      plan: nextPlan,
      billingInterval: existing.billingInterval,
      subscriptionStatus: existing.subscriptionStatus,
      welcomeCreditsClaimed: Boolean(existing.welcomeCreditsClaimedAt),
    });

    const data: {
      plan?: "FREE" | "STARTER" | "PRO" | "BUSINESS";
      creditsRemaining?: number;
      name?: string;
    } = {};
    if (plan !== undefined) data.plan = nextPlan;
    if (creditsRemaining !== undefined) {
      data.creditsRemaining = clampCreditsToPlanCap(Number(creditsRemaining), maxCredits);
    }
    if (name !== undefined) data.name = name;

    const workspace = await prisma.workspace.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        creditsRemaining: true,
        videoMinutesUsed: true,
        imageCountUsed: true,
        premiumCreditsUsed: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}
