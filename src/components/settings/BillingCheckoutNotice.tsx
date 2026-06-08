"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { formatPlanLabel } from "@/lib/billing/plans";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function BillingCheckoutNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    handledRef.current = true;

    const sessionId = searchParams.get("session_id");

    const clearCheckoutParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      router.replace(url.pathname + url.search);
    };

    if (checkout === "cancelled") {
      notify.info("Checkout cancelled.");
      clearCheckoutParams();
      return;
    }

    if (checkout !== "success") {
      clearCheckoutParams();
      return;
    }

    if (!sessionId) {
      notify.error("Payment received but the session could not be verified. Contact support if your plan did not update.");
      clearCheckoutParams();
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/workspace/billing/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await readJsonResponse<{
          ok?: boolean;
          workspace?: { plan?: string };
          error?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(responseErrorMessage(response, data, "Could not apply your subscription."));
        }

        const planLabel = data.workspace?.plan ? formatPlanLabel(data.workspace.plan) : "your new plan";
        notify.success(`Subscription active — you're now on ${planLabel}.`);
        router.refresh();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Could not apply your subscription.");
      } finally {
        clearCheckoutParams();
      }
    })();
  }, [router, searchParams]);

  return null;
}
