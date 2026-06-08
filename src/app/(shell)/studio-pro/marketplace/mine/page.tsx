import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { StudioProPageGate } from "@/components/studio-pro/StudioProPageGate";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { formatPriceCents } from "@/lib/billing/stripe";
import { listMyTemplateListings } from "@/lib/studio-pro/template-marketplace";

const statusLabel = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const;

export default async function MyStudioTemplatesPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="My templates unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  const listings = await listMyTemplateListings(currentUser.workspace.id);

  return (
    <StudioProPageGate>
      <div className="space-y-8 py-4 md:py-8">
        <section className="space-y-4">
          <Link
            href="/studio-pro/marketplace"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
              <Store className="h-3.5 w-3.5" />
              Your listings
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">My templates</h1>
            <p className="text-sm text-zinc-500">Drafts and published listings from your workspace.</p>
          </div>
        </section>

        {listings.length === 0 ? (
          <section className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold text-zinc-900">No listings yet</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Open a Studio Pro session and use &quot;Publish as template&quot; in the header.
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
                className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-purple-200 hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    {statusLabel[listing.status]}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">
                    {formatPriceCents(listing.priceCents, listing.currency)}
                  </span>
                </div>
                <h2 className="font-medium text-zinc-900">{listing.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{listing.description || "No description"}</p>
              </Link>
            ))}
          </section>
        )}
      </div>
    </StudioProPageGate>
  );
}
