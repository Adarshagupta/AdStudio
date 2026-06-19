"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Store, Workflow } from "lucide-react";

import { CreateStudioSessionButton } from "@/components/studio-pro/CreateStudioSessionButton";
import { StudioFlowList } from "@/components/studio-pro/StudioFlowList";
import { TemplateListingCover } from "@/components/studio-pro/TemplateListingCover";
import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";
import { cn } from "@/lib/utils";

type StudioTab = "sessions" | "marketplace";

interface Flow {
  id: string;
  name: string | null;
  updatedAt: string;
}

interface MarketplaceListing {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  previewImageUrl: string | null;
  sampleOutputs: TemplateSampleOutput[];
  publisher: { workspaceName: string };
  category: string | null;
  useCount: number;
}

export function StudioProTabs({
  flows,
  listings: initialListings,
}: {
  flows: Flow[];
  listings: MarketplaceListing[];
}) {
  const [tab, setTab] = useState<StudioTab>("sessions");
  const [listings] = useState<MarketplaceListing[]>(initialListings);

  return (
    <div className="space-y-6 py-4 md:py-8">
      {/* Header */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
            Visual flow builder
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-[2.75rem] md:leading-tight">
              Studio Pro
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Build node-based ad flows, auto-save your work, and browse community templates.
            </p>
          </div>
        </div>
        {tab === "sessions" && (
          <CreateStudioSessionButton className="shrink-0">
            <Plus className="h-4 w-4" />
            New session
          </CreateStudioSessionButton>
        )}
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-100">
        <button
          type="button"
          onClick={() => setTab("sessions")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition",
            tab === "sessions"
              ? "border-b-2 border-zinc-900 text-foreground"
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Workflow className="h-4 w-4" />
          Sessions
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {flows.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("marketplace")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition",
            tab === "marketplace"
              ? "border-b-2 border-zinc-900 text-foreground"
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Store className="h-4 w-4" />
          Marketplace
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {listings.length}
          </span>
        </button>
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="space-y-6">
          {flows.length === 0 ? (
            <section className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <Workflow className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
                No sessions yet
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Create your first flow canvas. Every session gets its own saved link.
              </p>
              <CreateStudioSessionButton className="mt-6">
                Create session
              </CreateStudioSessionButton>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center gap-6">
                <p className="text-sm font-medium text-foreground">Recent sessions</p>
                <p className="text-sm text-zinc-400">{flows.length} saved</p>
              </div>
              <StudioFlowList
                flows={flows.map((flow) => ({
                  id: flow.id,
                  name: flow.name ?? "Untitled flow",
                  updatedAt: flow.updatedAt,
                }))}
              />
            </section>
          )}
        </div>
      )}

      {/* Marketplace Tab */}
      {tab === "marketplace" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Community templates
            </p>
            <Link
              href="/studio-pro/marketplace/mine"
              className="text-sm text-purple-600 hover:underline"
            >
              My templates
            </Link>
          </div>

          {listings.length === 0 ? (
            <section className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                No templates yet
              </h2>
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
                  className="group rounded-2xl border border-border bg-card p-4 transition hover:border-purple-200 hover:shadow-md"
                >
                  <TemplateListingCover
                    previewImageUrl={listing.previewImageUrl}
                    sampleOutputs={listing.sampleOutputs}
                    title={listing.title}
                  />
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium text-foreground group-hover:text-purple-700">
                        {listing.title}
                      </h2>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {listing.priceCents === 0
                          ? "Free"
                          : `$${(listing.priceCents / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-500">
                      {listing.description || "No description"}
                    </p>
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
      )}
    </div>
  );
}
