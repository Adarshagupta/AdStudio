import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { getAppUrl } from "@/lib/integrations/app-url";
import { parseSampleOutputs, templateSampleCoverUrl } from "@/lib/studio-pro/template-sample-types";
import {
  getTemplateListingById,
  workspaceCanUseListing,
  workspacePurchasedListing,
} from "@/lib/studio-pro/template-marketplace";

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to purchase templates." }, { status: 403 });
  }

  const { listingId } = await context.params;
  const listing = await getTemplateListingById(listingId);

  if (!listing || listing.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  if (listing.priceCents <= 0) {
    return NextResponse.json({ error: "This template is free — use it directly." }, { status: 400 });
  }

  if (await workspaceCanUseListing(currentUser.workspace.id, listing)) {
    return NextResponse.json({ error: "Your workspace already owns this template." }, { status: 400 });
  }

  if (await workspacePurchasedListing(currentUser.workspace.id, listing.id)) {
    return NextResponse.json({ error: "Your workspace already owns this template." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const appUrl = getAppUrl(request);
  const stripe = getStripe();
  const sampleOutputs = parseSampleOutputs(listing.sampleOutputs);
  const coverImageUrl = listing.previewImageUrl ?? templateSampleCoverUrl(sampleOutputs);
  const stripeImages =
    coverImageUrl && sampleOutputs.some((sample) => sample.type === "image" && sample.url === coverImageUrl)
      ? [coverImageUrl]
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: listing.currency,
          unit_amount: listing.priceCents,
          product_data: {
            name: listing.title,
            description: listing.description || undefined,
            images: stripeImages,
          },
        },
      },
    ],
    metadata: {
      listingId: listing.id,
      workspaceId: currentUser.workspace.id,
      userId: currentUser.user.id,
    },
    success_url: `${appUrl}/studio-pro/marketplace/${listing.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/studio-pro/marketplace/${listing.slug}?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
