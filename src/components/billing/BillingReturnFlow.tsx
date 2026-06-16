"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SubscriptionPurchaseSuccess } from "@/components/billing/SubscriptionPurchaseSuccess";
import type { SubscriptionPurchaseDetails } from "@/lib/billing/purchase-summary";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";

type FlowState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; purchase: SubscriptionPurchaseDetails }
  | { status: "error"; message: string }
  | { status: "cancelled" };

type BillingReturnFlowProps = {
  continueHref: string;
  continueLabel: string;
};

export function BillingReturnFlow({ continueHref, continueLabel }: BillingReturnFlowProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);
  const [state, setState] = useState<FlowState>({ status: "idle" });

  useEffect(() => {
    if (handledRef.current) return;

    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    handledRef.current = true;

    if (checkout === "cancelled") {
      setState({ status: "cancelled" });
      return;
    }

    if (checkout !== "success") {
      router.replace(continueHref);
      return;
    }

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setState({
        status: "error",
        message: "Payment received but the session could not be verified.",
      });
      return;
    }

    setState({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch("/api/workspace/billing/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await readJsonResponse<{
          ok?: boolean;
          purchase?: SubscriptionPurchaseDetails;
          error?: string;
        }>(response);

        if (!response.ok || !data.purchase) {
          throw new Error(responseErrorMessage(response, data, "Could not apply your subscription."));
        }

        router.replace("/billing/return", { scroll: false });
        setState({ status: "success", purchase: data.purchase });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not apply your subscription.",
        });
      }
    })();
  }, [continueHref, router, searchParams]);

  if (state.status === "idle") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-[#e4e2de] bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-[#6b6965]">No checkout in progress.</p>
        <Link
          href={continueHref}
          className="mt-4 inline-block text-sm font-medium text-[#5b3cf5] hover:underline"
        >
          Continue
        </Link>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#e4e2de] bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#5b3cf5]" />
        <h1 className="font-display text-xl font-semibold text-[#111110]">Activating your plan…</h1>
        <p className="text-sm leading-relaxed text-[#6b6965]">
          Confirming your subscription with Stripe.
        </p>
      </div>
    );
  }

  if (state.status === "cancelled") {
    return (
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#e4e2de] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-[#111110]">Checkout cancelled</h1>
        <p className="text-sm leading-relaxed text-[#6b6965]">
          No changes were made to your plan. You can upgrade anytime from billing settings.
        </p>
        <Link
          href={continueHref}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b3cf5] px-5 text-sm font-semibold text-white hover:bg-[#4f32e0]"
        >
          {continueLabel}
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#e4e2de] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-[#111110]">Something went wrong</h1>
        <p className="text-sm leading-relaxed text-[#6b6965]">{state.message}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/settings/billing"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b3cf5] px-5 text-sm font-semibold text-white hover:bg-[#4f32e0]"
          >
            Billing settings
          </Link>
          <Link
            href={continueHref}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#e4e2de] px-5 text-sm font-medium text-[#111110] hover:bg-[#f7f6f3]"
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionPurchaseSuccess
      purchase={state.purchase}
      continueHref={continueHref}
      continueLabel={continueLabel}
    />
  );
}
