import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { StudioMarketplaceCheckoutNotice } from "@/components/studio-pro/StudioMarketplaceCheckoutNotice";
import { StudioProPageGate } from "@/components/studio-pro/StudioProPageGate";
import { StudioTemplateDetailPanel } from "@/components/studio-pro/StudioTemplateDetailPanel";
import { StudioTemplatePreview } from "@/components/studio-pro/StudioTemplatePreview";
import { StudioTemplateSampleGallery } from "@/components/studio-pro/StudioTemplateSampleGallery";
import { parseSampleOutputs } from "@/lib/studio-pro/template-sample-types";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { formatPriceCents } from "@/lib/billing/stripe";
import {
  getTemplateListingBySlug,
  listingSnapshotFromRecord,
  toPublicListingFromRecord,
  workspaceCanUseListing,
} from "@/lib/studio-pro/template-marketplace";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StudioTemplateDetailPage({ params }: PageProps) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Template preview unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  const { slug } = await params;
  const listing = await getTemplateListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  const isOwner = listing.publisherWorkspaceId === currentUser.workspace.id;
  if (listing.status !== "PUBLISHED" && !isOwner) {
    notFound();
  }

  const owned = await workspaceCanUseListing(currentUser.workspace.id, listing);
  const publicListing = toPublicListingFromRecord(listing);
  const snapshot = listingSnapshotFromRecord(listing);
  const sampleOutputs = parseSampleOutputs(listing.sampleOutputs);

  return (
    <StudioProPageGate>
      <Suspense fallback={null}>
        <StudioMarketplaceCheckoutNotice />
      </Suspense>
      <div className="space-y-8 py-4 md:py-8">
        <Link
          href="/studio-pro/marketplace"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {sampleOutputs.length > 0 ? (
              <StudioTemplateSampleGallery samples={sampleOutputs} />
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900">Flow structure</p>
              <StudioTemplatePreview nodes={snapshot.nodes} edges={snapshot.edges} className="min-h-[360px]" />
              <p className="text-xs text-zinc-400">Read-only preview — prompts and structure only.</p>
            </div>
          </div>

          <aside className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-zinc-900">
                {formatPriceCents(publicListing.priceCents, publicListing.currency)}
              </p>
              <h1 className="font-display text-2xl font-semibold text-zinc-900">{publicListing.title}</h1>
              <p className="text-sm leading-6 text-zinc-600">{publicListing.description || "No description provided."}</p>
            </div>

            <div className="space-y-1 text-sm text-zinc-500">
              <p>By {publicListing.publisher.workspaceName}</p>
              {publicListing.category ? <p>Category: {publicListing.category}</p> : null}
              {publicListing.tags.length > 0 ? (
                <p>Tags: {publicListing.tags.join(", ")}</p>
              ) : null}
              {publicListing.useCount > 0 ? <p>{publicListing.useCount} workspace uses</p> : null}
            </div>

            <StudioTemplateDetailPanel
              listingId={publicListing.id}
              slug={publicListing.slug}
              title={publicListing.title}
              description={publicListing.description}
              priceCents={publicListing.priceCents}
              category={publicListing.category}
              tags={publicListing.tags}
              sampleOutputs={sampleOutputs}
              owned={owned}
              isOwner={isOwner}
              sourceFlowId={listing.sourceFlowId}
            />
          </aside>
        </section>
      </div>
    </StudioProPageGate>
  );
}
