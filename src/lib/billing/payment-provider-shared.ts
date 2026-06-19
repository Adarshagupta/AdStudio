export type BillingProviderId = "dodo" | "stripe" | "none";

export function getBillingProviderLabel(provider: BillingProviderId) {
  if (provider === "dodo") return "Dodo Payments";
  if (provider === "stripe") return "Stripe";
  return "None";
}
