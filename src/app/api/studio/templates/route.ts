import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import {
  createDraftListingFromFlow,
  listPublishedTemplateListings,
} from "@/lib/studio-pro/template-marketplace";

const createSchema = z.object({
  sourceFlowId: z.string().min(1),
  title: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "24");

  const result = await listPublishedTemplateListings({
    search,
    category,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 24,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to publish templates." }, { status: 403 });
  }

  const body = (await parseRequestJson(request)) ?? {};
  const result = createSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const listing = await createDraftListingFromFlow({
      sourceFlowId: result.data.sourceFlowId,
      workspaceId: currentUser.workspace.id,
      userId: currentUser.user.id,
      title: result.data.title,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template listing.";
    const status = message.includes("already published") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
