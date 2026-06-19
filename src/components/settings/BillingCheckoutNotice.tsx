"use client";

import { Suspense } from "react";

import { BillingCheckoutRedirect } from "@/components/billing/BillingCheckoutRedirect";

export function BillingCheckoutNotice() {
  return (
    <Suspense fallback={null}>
      <BillingCheckoutRedirect />
    </Suspense>
  );
}
