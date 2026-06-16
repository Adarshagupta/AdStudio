"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SubscriptionPurchaseDetails } from "@/lib/billing/purchase-summary";
import { formatPriceCents } from "@/lib/billing/stripe-client";

type SubscriptionPurchaseSuccessProps = {
  purchase: SubscriptionPurchaseDetails;
  continueHref: string;
  continueLabel: string;
};

function formatDueToday(cents: number, currency: string) {
  if (cents <= 0) return "Free today";
  return formatPriceCents(cents, currency);
}

export function SubscriptionPurchaseSuccess({
  purchase,
  continueHref,
  continueLabel,
}: SubscriptionPurchaseSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="w-full max-w-lg overflow-hidden rounded-[24px] border border-[#e4e2de] bg-white shadow-[0_24px_64px_rgba(17,17,16,0.12)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-[#5b3cf5]/10 via-white to-[#f7f6f3] px-6 pb-5 pt-8 text-center sm:px-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#5b3cf5]/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[#5b3cf5]/8" />

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 420, damping: 22 }}
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#5b3cf5] shadow-[0_8px_24px_rgba(91,60,245,0.35)]"
        >
          <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
        </motion.div>

        <h1 className="relative mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-[#111110]">
          You&apos;re all set!
        </h1>
        <p className="relative mt-2 text-sm leading-relaxed text-[#6b6965]">
          {purchase.isTrial
            ? `Your ${purchase.trialDays ?? 7}-day ${purchase.planName} trial is active.`
            : `Your ${purchase.planName} subscription is now active.`}
        </p>
      </div>

      <div className="space-y-5 px-6 py-6 sm:px-8">
        <div className="rounded-2xl border border-[#e4e2de] bg-[#f7f6f3] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-[#111110]">{purchase.planName}</p>
                {purchase.isTrial ? (
                  <span className="rounded-full bg-[#5b3cf5]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5b3cf5]">
                    Trial
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-[#6b6965]">{purchase.tagline}</p>
            </div>
            {purchase.priceAmount != null ? (
              <div className="text-right">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-[#111110]">
                  ${purchase.priceAmount}
                </p>
                <p className="text-xs text-[#a8a49f]">{purchase.priceSuffix}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e4e2de] pt-4 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#a8a49f]">
                Due today
              </p>
              <p className="mt-1 font-semibold text-[#111110]">
                {formatDueToday(purchase.amountDueTodayCents, purchase.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#a8a49f]">
                Credits included
              </p>
              <p className="mt-1 font-semibold text-[#111110]">
                ${purchase.creditsIncluded}
                <span className="ml-1 text-xs font-normal text-[#6b6965]">
                  ({purchase.creditsRemaining.toLocaleString()} balance)
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#a8a49f]">
                Billing cycle
              </p>
              <p className="mt-1 font-semibold text-[#111110]">{purchase.intervalLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#a8a49f]">
                {purchase.isTrial ? "First charge" : "Next billing"}
              </p>
              <p className="mt-1 font-semibold text-[#111110]">
                {purchase.nextBillingDate ?? "—"}
              </p>
            </div>
          </div>

          {purchase.isTrial && purchase.trialEndsAt ? (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-[#6b6965]">
              Trial ends {purchase.trialEndsAt}. Cancel anytime before then — you won&apos;t be charged.
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#5b3cf5]" />
            <p className="text-sm font-semibold text-[#111110]">What&apos;s included</p>
          </div>
          <ul className="space-y-2.5">
            {purchase.features.map((feature, index) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.04 }}
                className="flex items-start gap-2.5 text-sm text-[#3d3c39]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5b3cf5]/10">
                  <Check className="h-3 w-3 text-[#5b3cf5]" strokeWidth={2.5} />
                </span>
                {feature}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button
            asChild
            className="h-11 flex-1 rounded-xl border-0 bg-[#5b3cf5] text-sm font-semibold text-white shadow-[0_4px_16px_rgba(91,60,245,0.28)] hover:bg-[#4f32e0] hover:text-white"
          >
            <Link href={continueHref} className="inline-flex items-center justify-center text-white">
              {continueLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-[#e4e2de] bg-white text-sm font-medium text-[#111110] hover:bg-[#f7f6f3]"
          >
            <Link href="/settings/billing">View billing</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
