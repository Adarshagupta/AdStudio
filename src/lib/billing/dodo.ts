import "server-only";

import DodoPayments from "dodopayments";

let dodoClient: DodoPayments | null = null;

export function isDodoConfigured() {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY?.trim());
}

export function getDodoEnvironment(): "live_mode" | "test_mode" {
  const configured = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim().toLowerCase();
  return configured === "live_mode" ? "live_mode" : "test_mode";
}

export function getDodo() {
  if (!dodoClient) {
    const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
    if (!bearerToken) {
      throw new Error("DODO_PAYMENTS_API_KEY is not configured.");
    }

    dodoClient = new DodoPayments({
      bearerToken,
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || null,
      environment: getDodoEnvironment(),
    });
  }

  return dodoClient;
}

export function getDodoWebhookKey() {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) {
    throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not configured.");
  }
  return secret;
}

export async function cancelDodoSubscription(subscriptionId: string) {
  try {
    await getDodo().subscriptions.update(subscriptionId, {
      status: "cancelled",
      cancel_reason: "cancelled_by_merchant",
    });
  } catch {
    // Subscription may already be cancelled in Dodo.
  }
}
