import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import {
  createStudioFlowFromSnapshot,
} from "@/lib/studio-pro/flows";
import {
  getTemplateListingById,
  incrementTemplateUseCount,
  listingSnapshotFromRecord,
  workspaceCanUseListing,
} from "@/lib/studio-pro/template-marketplace";

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to use templates." }, { status: 403 });
  }

  const { listingId } = await context.params;
  const listing = await getTemplateListingById(listingId);

  if (!listing || listing.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  if (!(await workspaceCanUseListing(currentUser.workspace.id, listing))) {
    return NextResponse.json({ error: "Purchase this template before using it." }, { status: 402 });
  }

  const snapshot = listingSnapshotFromRecord(listing);
  const flow = await createStudioFlowFromSnapshot(
    currentUser.workspace.id,
    currentUser.user.id,
    snapshot,
    listing.title,
  );

  await incrementTemplateUseCount(listing.id);

  return NextResponse.json({ flowId: flow.id, flowName: flow.name });
}
