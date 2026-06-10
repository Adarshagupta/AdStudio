"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, Gift, Loader2, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WELCOME_CREDIT_BONUS,
  type WorkspaceWelcomeStatus,
  shouldShowWelcomeCreditsCard,
} from "@/lib/billing/welcome-credits";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

type PopupPhase = "claim" | "payment";

function resolvePhase(status: WorkspaceWelcomeStatus, isAdmin: boolean): PopupPhase | null {
  if (!status.welcomeCreditsClaimed) return "claim";
  if (isAdmin && !status.paymentSetupResolved) return "payment";
  return null;
}

export function DashboardWelcomeCredits({
  initialStatus,
  isAdmin,
}: {
  initialStatus: WorkspaceWelcomeStatus;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [claimDismissed, setClaimDismissed] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const phase = resolvePhase(status, isAdmin);
  const shouldShow =
    shouldShowWelcomeCreditsCard(status, isAdmin) &&
    phase !== null &&
    !(phase === "claim" && claimDismissed);

  useEffect(() => {
    if (!shouldShow) {
      setOpen(false);
      setEntered(false);
      return;
    }

    setOpen(true);
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [shouldShow, phase]);

  function closePopup(options?: { dismissClaim?: boolean }) {
    if (options?.dismissClaim) {
      setClaimDismissed(true);
    }
    setEntered(false);
    window.setTimeout(() => setOpen(false), 220);
  }

  async function claimCredits() {
    if (!isAdmin || status.welcomeCreditsClaimed) return;

    setIsBusy(true);
    try {
      const response = await fetch("/api/workspace/claim-credits", { method: "POST" });
      const data = await readJsonResponse<{
        error?: string;
        creditsRemaining?: number;
        alreadyClaimed?: boolean;
        bonus?: number;
      }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not claim credits."));
      }

      setStatus((current) => ({
        ...current,
        welcomeCreditsClaimed: true,
        creditsRemaining:
          typeof data.creditsRemaining === "number"
            ? data.creditsRemaining
            : current.creditsRemaining,
      }));
      notify.success(
        data.alreadyClaimed
          ? "Welcome credits were already claimed."
          : `${data.bonus ?? WELCOME_CREDIT_BONUS} credits added.`,
      );
      router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not claim credits.");
    } finally {
      setIsBusy(false);
    }
  }

  async function savePaymentSetup(action: "skip" | "complete") {
    if (!isAdmin) return;

    if (action === "complete") {
      const digits = cardNumber.replace(/\D/g, "");
      const [expMonth, expYear] = cardExpiry.split("/");
      if (cardholderName.trim().length < 2) {
        notify.error("Enter the name on your card.");
        return;
      }
      if (digits.length < 13) {
        notify.error("Enter a valid card number.");
        return;
      }
      if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
        notify.error("Enter a valid expiry date (MM/YY).");
        return;
      }
      if (cardCvc.replace(/\D/g, "").length < 3) {
        notify.error("Enter a valid security code.");
        return;
      }
    }

    setIsBusy(true);
    try {
      const response = await fetch("/api/workspace/payment-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not save payment setup."));
      }

      setStatus((current) => ({
        ...current,
        paymentSetupResolved: true,
        paymentSetupCompleted: action === "complete",
        paymentSetupSkipped: action === "skip",
      }));
      notify.success(
        action === "skip"
          ? "You can add auto-recharge later in Billing."
          : "Card saved for auto-recharge when credits run out.",
      );
      closePopup();
      router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not save payment setup.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!open || !phase) return null;

  return (
    <div
      className={`dashboard-studio-promo fixed bottom-4 left-4 right-4 z-50 md:left-6 md:right-auto md:max-w-[300px] ${
        entered ? "dashboard-studio-promo-enter" : "dashboard-studio-promo-exit"
      }`}
      role="dialog"
      aria-labelledby="dashboard-welcome-title"
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] ring-1 ring-zinc-100">
        {phase === "claim" ? (
          <>
            <div className="relative p-3.5 pr-10">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => closePopup({ dismissClaim: true })}
                  className="absolute right-2 top-2 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <Gift className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <p id="dashboard-welcome-title" className="text-sm font-semibold text-zinc-900">
                    Claim your welcome credits
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {isAdmin
                      ? `${WELCOME_CREDIT_BONUS} free credits to start creating. Paid plans include credits equal to your subscription.`
                      : "Ask a workspace admin to claim your team's welcome credits."}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-zinc-100 px-3 py-2.5">
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  disabled={isBusy}
                  onClick={() => void claimCredits()}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Claiming…
                    </>
                  ) : (
                    `Claim ${WELCOME_CREDIT_BONUS} credits`
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => closePopup({ dismissClaim: true })}
                >
                  Got it
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="relative p-3.5 pr-10">
              <button
                type="button"
                onClick={() => void savePaymentSetup("skip")}
                className="absolute right-2 top-2 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Skip auto-recharge setup"
                disabled={isBusy}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <Zap className="h-4 w-4 text-zinc-700" />
                </div>
                <div>
                  <p id="dashboard-welcome-title" className="text-sm font-semibold text-zinc-900">
                    Auto-recharge
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Add a card so credits refill automatically when you run out. You won&apos;t be charged
                    until then.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-100 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                <CreditCard className="h-3 w-3" />
                Payment method
              </div>
              <Input
                value={cardholderName}
                onChange={(event) => setCardholderName(event.target.value)}
                placeholder="Name on card"
                disabled={isBusy}
                className="h-8 text-xs"
              />
              <Input
                value={cardNumber}
                onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                placeholder="Card number"
                inputMode="numeric"
                disabled={isBusy}
                className="h-8 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={cardExpiry}
                  onChange={(event) => setCardExpiry(formatExpiry(event.target.value))}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
                <Input
                  value={cardCvc}
                  onChange={(event) =>
                    setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="CVC"
                  inputMode="numeric"
                  disabled={isBusy}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  disabled={isBusy}
                  onClick={() => void savePaymentSetup("complete")}
                >
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save card"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 text-xs text-zinc-500"
                  disabled={isBusy}
                  onClick={() => void savePaymentSetup("skip")}
                >
                  Skip
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
