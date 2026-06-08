export type BillingInterval = "monthly" | "yearly";
export type SubscriptionPlanId = "FREE" | "STARTER" | "PLUS" | "PRO";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  badge?: string;
  monthlyPrice: number | null;
  monthlyCompareAt: number | null;
  yearlyPricePerMonth: number | null;
  yearlyCompareAtPerMonth: number | null;
  creditsLabel: string | null;
  creditsPerDollar: number | null;
  showTrial?: boolean;
  features: string[];
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "FREE",
    name: "Free",
    tagline: "Just trying things out",
    monthlyPrice: null,
    monthlyCompareAt: null,
    yearlyPricePerMonth: null,
    yearlyCompareAtPerMonth: null,
    creditsLabel: "Always free",
    creditsPerDollar: null,
    features: [
      "Get free daily credits",
      "Use Video agent",
      "Remix viral videos",
      "Create AI talking photos",
      "Use Image agent",
      "Generate avatar videos",
      "Make 3 free photo avatars (30+ languages)",
      "Some features might cost credits",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    tagline: "For creators starting their journey",
    monthlyPrice: 12,
    monthlyCompareAt: 20,
    yearlyPricePerMonth: 8,
    yearlyCompareAtPerMonth: 14,
    creditsLabel: "2100",
    creditsPerDollar: 1.75,
    showTrial: true,
    features: [
      "Get free daily credits",
      "Buy credits",
      "Enjoy fast generation",
      "Unlock advanced AI models",
      "Remove watermark",
      "Upscale (up to 4k)",
      "Customize 1 free video avatar",
      "Create unlimited photo avatars",
      "Run more concurrent tasks",
      "Manage products and content",
      "Get storage of 500 GB",
    ],
  },
  {
    id: "PLUS",
    name: "Plus",
    tagline: "For active creators scaling up output",
    monthlyPrice: 36,
    monthlyCompareAt: 60,
    yearlyPricePerMonth: 24,
    yearlyCompareAtPerMonth: 40,
    creditsLabel: "6700",
    creditsPerDollar: 1.86,
    features: [
      "Get free daily credits",
      "Buy credits",
      "Enjoy faster generation",
      "Unlock advanced AI models",
      "Remove watermark",
      "Upscale (up to 4k)",
      "Customize 3 free video avatars",
      "Create unlimited photo avatars",
      "Run more concurrent tasks",
      "Manage products and content",
      "Get storage of 500 GB",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    tagline: "For professionals producing content at scale",
    badge: "Best value",
    monthlyPrice: 90,
    monthlyCompareAt: 150,
    yearlyPricePerMonth: 60,
    yearlyCompareAtPerMonth: 100,
    creditsLabel: "17600",
    creditsPerDollar: 1.96,
    features: [
      "Get free daily credits",
      "Buy credits",
      "Enjoy fastest generation",
      "Unlock advanced AI models",
      "Remove watermark",
      "Upscale (up to 4k)",
      "Customize 10 free video avatars",
      "Create unlimited photo avatars",
      "Run more concurrent tasks",
      "Manage products and content",
      "Get unlimited storage space",
      "Get early beta access",
    ],
  },
];

export const planCreditAllocation: Record<SubscriptionPlanId, number> = {
  FREE: 25,
  STARTER: 2100,
  PLUS: 6700,
  PRO: 17600,
};

export function formatPlanLabel(plan: string) {
  const match = subscriptionPlans.find((entry) => entry.id === plan);
  if (match) return match.name;
  if (plan === "FREE") return "Free";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function getPlanPrice(plan: SubscriptionPlan, interval: BillingInterval) {
  if (plan.id === "FREE") return null;

  if (interval === "yearly") {
    return {
      amount: plan.yearlyPricePerMonth,
      compareAt: plan.yearlyCompareAtPerMonth,
      suffix: "/mo billed yearly",
    };
  }

  return {
    amount: plan.monthlyPrice,
    compareAt: plan.monthlyCompareAt,
    suffix: "/Monthly",
  };
}

export function creditsForSubscription(planId: SubscriptionPlanId, interval: BillingInterval) {
  const base = planCreditAllocation[planId];
  if (planId === "FREE") return base;
  return interval === "yearly" ? base * 12 : base;
}

export function planCheckoutPricing(planId: SubscriptionPlanId, interval: BillingInterval) {
  if (planId === "FREE") {
    return null;
  }

  const plan = subscriptionPlans.find((entry) => entry.id === planId);
  if (!plan) {
    return null;
  }

  if (interval === "yearly") {
    const monthly = plan.yearlyPricePerMonth ?? 0;
    return {
      unitAmountCents: monthly * 12 * 100,
      recurringInterval: "year" as const,
      label: `${plan.name} (yearly)`,
    };
  }

  return {
    unitAmountCents: (plan.monthlyPrice ?? 0) * 100,
    recurringInterval: "month" as const,
    label: `${plan.name} (monthly)`,
  };
}
