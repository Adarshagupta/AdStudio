#!/usr/bin/env node
import fs from "fs";
import path from "path";
import DodoPayments from "dodopayments";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*(DODO_[A-Z0-9_]+)\s*=\s*"?([^"]*)"?/);
    if (m) process.env[m[1]] = m[2];
  }
}

const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
const productId = process.env.DODO_SUBSCRIPTION_PRODUCT_ID?.trim();
const environment = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode";

if (!apiKey || !productId) {
  console.error("Missing DODO_PAYMENTS_API_KEY or DODO_SUBSCRIPTION_PRODUCT_ID");
  process.exit(1);
}

const client = new DodoPayments({ bearerToken: apiKey, environment });

const payloads = {
  current: {
    label: "current (whitelist + feature_flags)",
    body: {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: "test@example.com", name: "Test User" },
      return_url: "https://example.com/return",
      allowed_payment_method_types: ["credit", "debit", "apple_pay", "google_pay", "upi_collect", "upi_intent"],
      feature_flags: { allow_discount_code: true },
      subscription_data: {
        on_demand: {
          mandate_only: false,
          product_price: 2900,
          product_description: "Pro (monthly)",
          product_currency: "USD",
        },
      },
    },
  },
  openMethods: {
    label: "open methods + full feature_flags",
    body: {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: "test@example.com", name: "Test User" },
      return_url: "https://example.com/return",
      feature_flags: {
        allow_discount_code: true,
        allow_currency_selection: true,
        allow_customer_editing_country: true,
      },
      subscription_data: {
        on_demand: {
          mandate_only: false,
          product_price: 2900,
          product_description: "Pro (monthly)",
          product_currency: "USD",
        },
      },
    },
  },
  indiaInr: {
    label: "India INR + UPI whitelist",
    body: {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: "test@example.in", name: "Test India", phone_number: "+919876543210" },
      billing_address: { country: "IN", state: "KA", city: "Bangalore", zipcode: "560001", street: "MG Road" },
      billing_currency: "INR",
      return_url: "https://example.com/return",
      allowed_payment_method_types: ["credit", "debit", "upi_collect", "upi_intent"],
      feature_flags: { allow_discount_code: true, allow_currency_selection: true },
      subscription_data: {
        on_demand: {
          mandate_only: false,
          product_price: 249900,
          product_description: "Pro (monthly)",
          product_currency: "INR",
        },
      },
    },
  },
  standardRecurring: {
    label: "standard recurring (no on_demand override)",
    body: {
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: "test@example.com", name: "Test User" },
      return_url: "https://example.com/return",
      feature_flags: {
        allow_discount_code: true,
        allow_currency_selection: true,
      },
      subscription_data: {
        metadata: { type: "workspace_subscription", plan: "PRO", interval: "monthly" },
      },
    },
  },
};

for (const { label, body } of Object.values(payloads)) {
  try {
    const session = await client.checkoutSessions.create(body);
    console.log(`OK ${label}:`, session.session_id, session.checkout_url);
  } catch (error) {
    console.error(`FAIL ${label}:`, error.message ?? error);
  }
}

try {
  const preview = await client.checkoutSessions.preview({
    product_cart: [{ product_id: productId, quantity: 1 }],
    feature_flags: { allow_discount_code: true },
    subscription_data: {
      on_demand: {
        mandate_only: false,
        product_price: 2900,
        product_description: "Pro (monthly)",
        product_currency: "USD",
      },
    },
  });
  console.log("\nPreview on_demand USD:", {
    subtotal: preview.subtotal,
    total: preview.total,
    discount: preview.discount,
  });
} catch (error) {
  console.error("Preview failed:", error.message ?? error);
}

try {
  const product = await client.products.retrieve(productId);
  console.log("\nProduct:", {
    id: product.product_id,
    name: product.name,
    is_recurring: product.is_recurring,
    price: product.price,
    currency: product.currency,
  });
} catch (error) {
  console.error("Product retrieve failed:", error.message ?? error);
}
