"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function StudioMarketplaceCheckoutNotice() {
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
      notify.error("Payment received but the purchase could not be verified. Refresh the page or contact support.");
      clearCheckoutParams();
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/studio/templates/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await readJsonResponse<{ ok?: boolean; error?: string }>(response);

        if (!response.ok) {
          throw new Error(responseErrorMessage(response, data, "Could not complete your purchase."));
        }

        notify.success("Payment complete — you can use this template in Studio Pro.");
        router.refresh();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Could not complete your purchase.");
      } finally {
        clearCheckoutParams();
      }
    })();
  }, [router, searchParams]);

  return null;
}
