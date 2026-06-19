import "server-only";

import type { CheckoutSessionFlags } from "dodopayments/resources/checkout-sessions.js";
import type { PaymentMethodTypes } from "dodopayments/resources/payments.js";

export type DodoCheckoutCurrency = "USD" | "INR";

export function getRequestCountryCode(request: Request): string | null {
  for (const header of ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]) {
    const value = request.headers.get(header)?.trim().toUpperCase();
    if (value && value !== "XX" && value.length === 2) {
      return value;
    }
  }

  return null;
}

/** Checkout currency — INR for India (required for UPI), USD otherwise. */
export function getDodoCheckoutCurrency(request: Request): DodoCheckoutCurrency {
  const forced = process.env.DODO_CHECKOUT_CURRENCY?.trim().toUpperCase();
  if (forced === "INR" || forced === "USD") {
    return forced;
  }

  if (getRequestCountryCode(request) === "IN") {
    return "INR";
  }

  return "USD";
}

export function convertUsdCentsToInrPaise(usdCents: number) {
  const rate = Number(process.env.DODO_USD_TO_INR_RATE ?? "84");
  return Math.round((usdCents / 100) * rate * 100);
}

/** Promo codes are entered on Dodo's hosted checkout page only. */
export function getDodoCheckoutFeatureFlags(): CheckoutSessionFlags {
  return {
    allow_discount_code: true,
    allow_currency_selection: true,
    allow_customer_editing_country: true,
  };
}

/** UPI only appears for INR checkouts in India. */
export function getIndiaCheckoutPaymentMethods(): PaymentMethodTypes[] {
  return ["credit", "debit", "upi_collect", "upi_intent"];
}
