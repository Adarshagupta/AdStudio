"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type BillingInterval,
  formatPlanLabel,
  getPlanPrice,
  subscriptionPlans,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function SubscriptionPlans({
  currentPlan,
  creditsRemaining,
  isAdmin,
  stripeEnabled = false,
}: {
  currentPlan: SubscriptionPlanId;
  creditsRemaining: number;
  isAdmin: boolean;
  stripeEnabled?: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlanId | null>(null);

  const intervalLabel = useMemo(
    () => (interval === "monthly" ? "Monthly" : "Yearly"),
    [interval],
  );

  async function subscribe(planId: SubscriptionPlanId) {
    if (!isAdmin) {
      notify.error("Ask a workspace admin to change the subscription.");
      return;
    }

    setBusyPlan(planId);

    try {
      const useStripeCheckout = stripeEnabled && planId !== "FREE";
      const endpoint = useStripeCheckout
        ? "/api/workspace/billing/checkout"
        : "/api/workspace/billing/subscribe";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        url?: string;
        plan?: string;
        creditsRemaining?: number;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not update subscription."));
      }

      if (useStripeCheckout && data.url) {
        window.location.href = data.url;
        return;
      }

      notify.success(
        planId === "FREE"
          ? "You are on the Free plan."
          : `Subscribed to ${formatPlanLabel(planId)} (${intervalLabel}).`,
      );
      window.location.reload();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not update subscription.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Subscribe to boost your business
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Current plan: <span className="font-medium text-zinc-800">{formatPlanLabel(currentPlan)}</span>
            {" · "}
            {creditsRemaining.toLocaleString()} credits
          </p>
        </div>

        <div className="inline-flex rounded-full bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "monthly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "yearly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600",
            )}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {subscriptionPlans.map((plan) => {
          const pricing = getPlanPrice(plan, interval);
          const isCurrent = currentPlan === plan.id;
          const isFree = plan.id === "FREE";

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex h-full flex-col bg-white p-5",
                plan.id === "PRO" && "ring-2 ring-violet-500/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                    {plan.badge ? (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                        {plan.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{plan.tagline}</p>
                </div>
              </div>

              <div className="mt-5 min-h-[88px]">
                {isFree ? (
                  <div>
                    <p className="text-2xl font-semibold text-zinc-900">Always free</p>
                    <p className="mt-1 text-sm text-zinc-500">No credit card required.</p>
                  </div>
                ) : pricing ? (
                  <div>
                    <div className="flex items-end gap-2">
                      {pricing.compareAt ? (
                        <span className="text-lg text-zinc-400 line-through">${pricing.compareAt}</span>
                      ) : null}
                      <span className="text-3xl font-semibold text-zinc-900">${pricing.amount}</span>
                    </div>
                    <p className="text-sm text-zinc-500">{pricing.suffix}</p>
                    <p className="mt-2 text-xs text-zinc-400">Auto renews, cancel anytime.</p>
                  </div>
                ) : null}
              </div>

              {plan.creditsLabel && !isFree ? (
                <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm">
                  <p className="font-medium text-zinc-800">
                    {intervalLabel} {plan.creditsLabel}
                  </p>
                  {plan.creditsPerDollar ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Equal to $1 = {plan.creditsPerDollar} credits
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  className="w-full"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent || busyPlan !== null}
                  onClick={() => subscribe(plan.id)}
                >
                  {busyPlan === plan.id
                    ? "Processing…"
                    : isCurrent
                      ? "Current plan"
                      : isFree
                        ? "Downgrade to Free"
                        : stripeEnabled
                          ? "Upgrade with Stripe"
                          : "Subscribe"}
                </Button>
                {plan.showTrial && !isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busyPlan !== null || !isAdmin}
                    onClick={() => subscribe("STARTER")}
                  >
                    Use free trial
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 flex-1 border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-800">With {plan.name}, you can:</p>
                <ul className="mt-3 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-zinc-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      {!isAdmin ? (
        <p className="text-sm text-amber-700">
          Only workspace admins can change plans. Contact your admin to upgrade.
        </p>
      ) : null}
    </div>
  );
}
