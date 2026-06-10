import { NextResponse } from "next/server";

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
    const models = await prisma.model.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, provider, category, isPremium, usesIncludedQuota, cost, description } = body;

    if (!name || !provider || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const model = await prisma.model.create({
      data: {
        name,
        provider,
        category,
        isPremium: isPremium ?? false,
        usesIncludedQuota: usesIncludedQuota ?? true,
        cost: cost ?? 1,
        description: description || "",
      },
    });

    return NextResponse.json({ model });
  } catch {
    return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
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
      return NextResponse.json({ error: "Missing model ID" }, { status: 400 });
    }

    const body = await request.json();
    const { isPremium, usesIncludedQuota, cost, isActive } = body;

    const data: {
      isPremium?: boolean;
      usesIncludedQuota?: boolean;
      cost?: number;
      isActive?: boolean;
    } = {};

    if (isPremium !== undefined) data.isPremium = isPremium;
    if (usesIncludedQuota !== undefined) data.usesIncludedQuota = usesIncludedQuota;
    if (cost !== undefined) data.cost = cost;
    if (isActive !== undefined) data.isActive = isActive;

    const model = await prisma.model.update({
      where: { id },
      data,
    });

    return NextResponse.json({ model });
  } catch {
    return NextResponse.json({ error: "Failed to update model" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing model ID" }, { status: 400 });
    }

    // Prevent deleting system models
    const existing = await prisma.model.findUnique({ where: { id } });
    if (existing?.isSystem) {
      return NextResponse.json({ error: "Cannot delete system models" }, { status: 403 });
    }

    await prisma.model.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete model" }, { status: 500 });
  }
}
