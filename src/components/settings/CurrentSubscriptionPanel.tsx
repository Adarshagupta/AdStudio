"use client";

import { useState } from "react";
import { Calendar, CreditCard, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BillingProviderId } from "@/lib/billing/payment-provider-shared";
import { getBillingProviderLabel } from "@/lib/billing/payment-provider-shared";
import type { WorkspaceBillingSummary } from "@/lib/billing/workspace-billing-summary";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

function statusBadge(summary: WorkspaceBillingSummary) {
  if (summary.planId === "FREE") {
    return { label: "Free", className: "bg-zinc-100 text-foreground" };
  }
  if (summary.isTrial) {
    return { label: "Trial", className: "bg-violet-100 text-violet-700" };
  }
  if (summary.subscriptionStatus === "past_due") {
    return { label: "Past due", className: "bg-amber-100 text-amber-800" };
  }
  if (summary.cancelAtPeriodEnd) {
    return { label: "Canceling", className: "bg-amber-100 text-amber-800" };
  }
  if (summary.subscriptionStatus === "active") {
    return { label: "Active", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Subscribed", className: "bg-emerald-100 text-emerald-700" };
}

export function CurrentSubscriptionPanel({
  summary,
  isAdmin,
  checkoutEnabled,
  billingProvider,
}: {
  summary: WorkspaceBillingSummary;
  isAdmin: boolean;
  checkoutEnabled: boolean;
  billingProvider: BillingProviderId;
}) {
  const [busy, setBusy] = useState(false);
  const badge = statusBadge(summary);

  async function openBillingPortal() {
    if (!isAdmin) {
      notify.error("Ask a workspace admin to manage billing.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/workspace/billing/portal", { method: "POST" });
      const data = await readJsonResponse<{ url?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not open billing portal."));
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not open billing portal.");
    } finally {
      setBusy(false);
    }
  }

  const videoLimit = summary.limits.videoMinutes;
  const imageLimit = summary.limits.imageCount;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-gradient-to-br from-violet-50/80 via-white to-zinc-50/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{summary.planName}</h2>
              <Badge className={cn("hover:bg-inherit", badge.className)}>{badge.label}</Badge>
            </div>
            {summary.tagline ? (
              <p className="mt-1 text-sm text-zinc-500">{summary.tagline}</p>
            ) : null}
          </div>

          {summary.priceAmount != null && summary.planId !== "FREE" ? (
            <div className="text-left sm:text-right">
              <p className="text-2xl font-semibold text-foreground">${summary.priceAmount}</p>
              <p className="text-sm text-zinc-500">{summary.priceSuffix}</p>
            </div>
          ) : summary.planId === "FREE" ? (
            <div className="text-left sm:text-right">
              <p className="text-lg font-semibold text-foreground">$0</p>
              <p className="text-sm text-zinc-500">No active subscription</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" />
            Credits
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {summary.creditsRemaining.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {summary.planId === "FREE"
              ? "Upgrade for included credits"
              : summary.isTrial
                ? "Premium credits unlock after trial"
                : `$${summary.creditsIncluded} included per cycle`}
          </p>
        </div>

        {summary.intervalLabel ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <Calendar className="h-3.5 w-3.5" />
              Billing
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{summary.intervalLabel}</p>
            {summary.isTrial && summary.trialEndsAt ? (
              <p className="mt-0.5 text-xs text-zinc-500">Trial ends {summary.trialEndsAt}</p>
            ) : summary.nextBillingDate ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                {summary.cancelAtPeriodEnd ? "Access until" : "Renews"} {summary.nextBillingDate}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Video used</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {summary.usage.videoMinutesUsed} min
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {videoLimit != null ? `of ${videoLimit} min / cycle` : "Unlimited on this plan"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Images used</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {summary.usage.imageCountUsed.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {imageLimit != null ? `of ${imageLimit.toLocaleString()} / cycle` : "Unlimited on this plan"}
          </p>
        </div>
      </div>

      {summary.isTrial ? (
        <div className="border-t border-violet-100 bg-violet-50/50 px-6 py-4">
          <p className="text-sm text-violet-900">
            During your free trial you can use included video time and image generations. Premium
            model credits are available once your trial converts to a paid subscription.
          </p>
        </div>
      ) : null}

      {checkoutEnabled && summary.hasBillingCustomer && summary.planId !== "FREE" ? (
        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            View invoices, update your payment method, or cancel your subscription in{" "}
            {getBillingProviderLabel(summary.billingProvider ?? billingProvider)}.
          </p>
          <Button
            variant="outline"
            disabled={busy || !isAdmin}
            onClick={() => void openBillingPortal()}
            className="shrink-0"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening…
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage billing
              </>
            )}
          </Button>
        </div>
      ) : summary.planId === "FREE" ? (
        <div className="border-t border-border px-6 py-4">
          <p className="text-sm text-zinc-600">
            Choose a plan below to subscribe and unlock more credits, storage, and premium models.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
