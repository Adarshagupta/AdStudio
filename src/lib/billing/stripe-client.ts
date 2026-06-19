/** Client-safe price formatting (mirrors server stripe helper). */
export function formatPriceCents(priceCents: number, currency = "USD") {
  if (priceCents <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceCents / 100);
}
