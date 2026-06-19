"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Legacy billing page checkout params → dedicated return flow. */
export function BillingCheckoutRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    const params = new URLSearchParams();
    params.set("checkout", checkout);

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      params.set("session_id", sessionId);
    }

    router.replace(`/billing/return?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
