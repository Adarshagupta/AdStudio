"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dismissProTrialPopup,
  dismissProTrialPopupSession,
  isProTrialPopupDismissed,
  PRO_TRIAL_DAYS,
  PRO_TRIAL_PLAN,
  shouldOfferProTrial,
} from "@/lib/billing/pro-trial-popup";
import { subscriptionPlans } from "@/lib/billing/plans";
import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

const PRO_PLAN = subscriptionPlans.find((plan) => plan.id === "PRO")!;
const PREVIEW_VIDEO = FEATURED_INSPIRATION_VIDEOS[0];

const PRO_STATS = [
  { value: "3 hr", label: "Video" },
  { value: "500", label: "Images" },
  { value: "500 GB", label: "Storage" },
];

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.25 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type ProFreeTrialPopupProps = {
  plan: string;
  isAdmin: boolean;
  hasPaidSubscription?: boolean;
  checkoutEnabled?: boolean;
  paidCheckoutRequired?: boolean;
  showDelayMs?: number;
  surface?: "default" | "onboarding";
};

export function ProFreeTrialPopup({
  plan,
  isAdmin,
  hasPaidSubscription = false,
  checkoutEnabled = false,
  paidCheckoutRequired = false,
  showDelayMs = 700,
  surface = "default",
}: ProFreeTrialPopupProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const canStartPaidCheckout = !paidCheckoutRequired || checkoutEnabled;
  const showPaidCheckoutCopy = paidCheckoutRequired || checkoutEnabled;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!shouldOfferProTrial(plan, hasPaidSubscription) || isProTrialPopupDismissed({ surface })) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), showDelayMs);
    return () => window.clearTimeout(timer);
  }, [hasPaidSubscription, plan, showDelayMs, surface]);

  function close(dismiss: false | "session" | "persist" = false) {
    if (dismiss === "session") dismissProTrialPopupSession();
    else if (dismiss === "persist") dismissProTrialPopup();
    setOpen(false);
  }

  async function startTrial() {
    if (!isAdmin) {
      notify.error("Ask a workspace admin to start the Pro trial.");
      return;
    }

    const useCheckout = paidCheckoutRequired || checkoutEnabled;

    if (useCheckout && !checkoutEnabled) {
      notify.error("Paid checkout is not available yet. Complete payment checkout to start a trial.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = useCheckout
        ? "/api/workspace/billing/checkout"
        : "/api/workspace/billing/subscribe";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: PRO_TRIAL_PLAN,
          interval: "monthly",
          ...(useCheckout ? { trial: true } : {}),
        }),
      });

      const data = await readJsonResponse<{ url?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not start trial."));
      }

      if (useCheckout && data.url) {
        window.location.href = data.url;
        return;
      }

      notify.success("Pro plan activated.");
      close(false);
      window.location.reload();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not start trial.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close"
                  className="fixed inset-0 z-[200] h-dvh w-screen bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  onClick={() => close("persist")}
                />

                <div className="pointer-events-none fixed inset-0 z-[201] flex h-dvh w-screen items-center justify-center p-4">
                  <motion.div
                    role="dialog"
                    aria-labelledby="pro-trial-title"
                    aria-modal="true"
                    className="pointer-events-auto relative flex w-full max-w-[620px] overflow-hidden rounded-[22px] border border-[#e4e2de] bg-[#f7f6f3] shadow-[0_24px_64px_rgba(17,17,16,0.14)]"
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
            <div className="pro-trial-glow pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full opacity-60" />

            <div className="relative flex shrink-0 items-center justify-center px-5 py-5 sm:px-6">
              <div className="pro-trial-phone-float relative">
                <div className="absolute -inset-3 rounded-[2.4rem] bg-[#5b3cf5]/12" />
                <div className="relative flex aspect-[9/19] w-[148px] flex-col overflow-hidden rounded-[1.65rem] border-[2.5px] border-zinc-800 bg-zinc-900 p-[5px] shadow-[0_12px_32px_rgba(17,17,16,0.18)] sm:w-[156px]">
                  <div className="mx-auto mb-1.5 h-[3px] w-10 rounded-full bg-zinc-600" />
                  <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.35rem] bg-black">
                    <video
                      src={PREVIEW_VIDEO}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" />
                  </div>
                  <div className="mx-auto mt-1.5 h-[3px] w-12 rounded-full bg-zinc-700" />
                </div>
              </div>
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col justify-center border-l border-[#e4e2de] bg-white py-5 pr-5 pl-4 sm:py-6 sm:pr-6 sm:pl-5">
              <button
                type="button"
                onClick={() => close("persist")}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-[#a8a49f] transition hover:bg-[#f7f6f3] hover:text-[#111110]"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pr-6">
                <div className="inline-flex items-center gap-2">
                  <span className="rounded-full border border-[#5b3cf5]/25 bg-[#5b3cf5]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5b3cf5]">
                    {showPaidCheckoutCopy ? `${PRO_TRIAL_DAYS}-day trial` : "Pro plan"}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a8a49f]">
                    Most popular
                  </span>
                </div>

                <h2
                  id="pro-trial-title"
                  className="mt-3 font-display text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-[#111110] sm:text-2xl"
                >
                  Create at{" "}
                  <span className="bg-gradient-to-r from-[#7c5cff] to-[#5b3cf5] bg-clip-text text-transparent">
                    Pro scale
                  </span>
                </h2>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-light tracking-[-0.03em] text-[#111110]">
                    ${PRO_PLAN.monthlyPrice}
                  </span>
                  <span className="text-sm text-[#6b6965]">/ month</span>
                  {showPaidCheckoutCopy ? (
                    <span className="ml-1 text-xs text-[#a8a49f]">· then billed monthly</span>
                  ) : null}
                </div>

                <p className="mt-2 text-[13px] leading-relaxed text-[#6b6965]">
                  {showPaidCheckoutCopy
                    ? `Full Pro video and image quota for ${PRO_TRIAL_DAYS} days. Premium model credits unlock when your trial converts to a paid plan. Cancel before the trial ends — no charge.`
                    : `Unlock Pro with $${PRO_PLAN.creditsLabel} credits included every month.`}
                </p>
              </div>

              <motion.ul
                className="mt-4 grid grid-cols-3 gap-1.5"
                variants={listVariants}
                initial="hidden"
                animate="show"
              >
                {PRO_STATS.map((stat) => (
                  <motion.li
                    key={stat.label}
                    variants={itemVariants}
                    className="rounded-lg border border-[#e4e2de] bg-[#f7f6f3] px-1.5 py-2 text-center"
                  >
                    <p className="text-[13px] font-semibold text-[#111110]">{stat.value}</p>
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#a8a49f]">
                      {stat.label}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-4 flex items-center gap-2">
                {isAdmin ? (
                  <Button
                    type="button"
                    disabled={busy || !canStartPaidCheckout}
                    onClick={() => void startTrial()}
                    className="relative h-10 flex-1 overflow-hidden rounded-xl border-0 bg-[#5b3cf5] text-sm font-semibold text-white shadow-[0_4px_16px_rgba(91,60,245,0.28)] hover:bg-[#4f32e0] hover:text-white"
                  >
                    <span
                      className="pro-trial-shimmer pointer-events-none absolute inset-0"
                      aria-hidden
                    />
                    <span className="relative z-10 inline-flex items-center text-white">
                      {busy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting…
                        </>
                      ) : (
                        <>
                          {showPaidCheckoutCopy ? "Start free trial" : "Upgrade to Pro"}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="h-10 flex-1 rounded-xl bg-[#5b3cf5] text-sm font-semibold text-white hover:bg-[#4f32e0] hover:text-white"
                  >
                    <Link
                      href="/settings/billing"
                      onClick={() => close("persist")}
                      className="inline-flex items-center text-white"
                    >
                      View plans
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => close("session")}
                  className="shrink-0 px-2 text-xs font-medium text-[#a8a49f] transition hover:text-[#6b6965]"
                >
                  Later
                </button>
              </div>
            </div>
                  </motion.div>
                </div>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
