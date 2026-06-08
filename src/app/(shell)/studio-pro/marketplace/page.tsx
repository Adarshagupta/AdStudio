import Link from "next/link";
import { Store } from "lucide-react";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { StudioProPageGate } from "@/components/studio-pro/StudioProPageGate";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { TemplateListingCover } from "@/components/studio-pro/TemplateListingCover";
import { formatPriceCents } from "@/lib/billing/stripe";
import { listPublishedTemplateListings } from "@/lib/studio-pro/template-marketplace";

export default async function StudioTemplateMarketplacePage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Marketplace access unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  const { listings } = await listPublishedTemplateListings({ pageSize: 48 });

  return (
    <StudioProPageGate>
      <div className="space-y-8 py-4 md:py-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
              <Store className="h-3.5 w-3.5" />
              Template marketplace
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-[2.75rem] md:leading-tight">
                Studio Pro templates
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Browse community flows, preview the canvas, and use them in your workspace.
              </p>
            </div>
          </div>
          <Link
            href="/studio-pro/marketplace/mine"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            My templates
          </Link>
        </section>

        {listings.length === 0 ? (
          <section className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold text-zinc-900">No templates yet</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Publish a flow from Studio Pro to list it here.
            </p>
            <Link
              href="/studio-pro"
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white"
            >
              Open Studio Pro
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/studio-pro/marketplace/${listing.slug}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-purple-200 hover:shadow-md"
              >
                <TemplateListingCover
                  previewImageUrl={listing.previewImageUrl}
                  sampleOutputs={listing.sampleOutputs}
                  title={listing.title}
                />
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium text-zinc-900 group-hover:text-purple-700">{listing.title}</h2>
                    <span className="shrink-0 text-sm font-semibold text-zinc-900">
                      {formatPriceCents(listing.priceCents, listing.currency)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-500">{listing.description || "No description"}</p>
                  <p className="text-xs text-zinc-400">
                    {listing.publisher.workspaceName}
                    {listing.category ? ` · ${listing.category}` : ""}
                    {listing.useCount > 0 ? ` · ${listing.useCount} uses` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </StudioProPageGate>
  );
}
