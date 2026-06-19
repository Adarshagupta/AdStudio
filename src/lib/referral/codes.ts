export const REFERRAL_REWARD_CREDITS = 10;
export const REFERRAL_COOKIE = "litemoov_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidReferralCodeFormat(value: string) {
  const normalized = normalizeReferralCode(value);
  return normalized.length >= 6 && normalized.length <= 16;
}

export function readReferralCodeFromCookie(cookieValue: string | undefined) {
  if (!cookieValue?.trim()) return null;
  const normalized = normalizeReferralCode(cookieValue);
  return isValidReferralCodeFormat(normalized) ? normalized : null;
}
