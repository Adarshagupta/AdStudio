import type { SubscriptionPlanId } from "@/lib/billing/plans";

export const PRO_TRIAL_POPUP_STORAGE_KEY = "pro-free-trial-popup-dismissed-at";
export const PRO_TRIAL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
export const PRO_TRIAL_PLAN: SubscriptionPlanId = "PRO";
export const PRO_TRIAL_DAYS = 7;

export function isProTrialPopupDismissed(options?: { surface?: "default" | "onboarding" }) {
  if (typeof window === "undefined") return true;

  try {
    if (options?.surface !== "onboarding" && isProTrialPopupSessionDismissed()) return true;

    const raw = window.localStorage.getItem(PRO_TRIAL_POPUP_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < PRO_TRIAL_DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissProTrialPopup() {
  try {
    window.localStorage.setItem(PRO_TRIAL_POPUP_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function shouldOfferProTrial(plan: string, hasStripeSubscription = false) {
  return plan === "FREE" && !hasStripeSubscription;
}

export const PRO_TRIAL_SESSION_DISMISS_KEY = "pro-free-trial-popup-session-dismissed";

export function isProTrialPopupSessionDismissed() {
  if (typeof window === "undefined") return false;

  try {
    return sessionStorage.getItem(PRO_TRIAL_SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissProTrialPopupSession() {
  try {
    sessionStorage.setItem(PRO_TRIAL_SESSION_DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}
