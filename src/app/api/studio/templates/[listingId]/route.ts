import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import {
  getTemplateListingByIdOrSlug,
  listingSnapshotFromRecord,
  toPublicListingFromRecord,
  updateTemplateListing,
  workspaceCanUseListing,
  workspaceOwnsListing,
} from "@/lib/studio-pro/template-marketplace";

const patchSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  previewImageUrl: z.string().url().nullable().optional(),
  sampleOutputIds: z.array(z.string().min(1)).max(12).optional(),
  priceCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId } = await context.params;
  const listing = await getTemplateListingByIdOrSlug(listingId);

  if (!listing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const isOwner = listing.publisherWorkspaceId === currentUser.workspace.id;
  if (listing.status !== "PUBLISHED" && !isOwner) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const owned = await workspaceCanUseListing(currentUser.workspace.id, listing);

  return NextResponse.json({
    listing: toPublicListingFromRecord(listing),
    snapshot: listingSnapshotFromRecord(listing),
    owned,
    isOwner,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to edit templates." }, { status: 403 });
  }

  const { listingId } = await context.params;

  if (!(await workspaceOwnsListing(currentUser.workspace.id, listingId))) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = (await parseRequestJson(request)) ?? {};
  const result = patchSchema.safeParse(body);

  if (!result.success) {
    const flattened = result.error.flatten();
    return NextResponse.json(
      {
        error: formatValidationErrors(flattened, "Invalid template update."),
        errors: flattened,
      },
      { status: 400 },
    );
  }

  try {
    const listing = await updateTemplateListing(listingId, currentUser.workspace.id, result.data);
    return NextResponse.json({ listing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update template.";
    const status = message.includes("already published") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
