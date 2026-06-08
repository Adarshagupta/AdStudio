export const MEMBERS_NAV_HINT_SESSION_KEY = "ugc:show-members-hint";

export function queueMembersNavHint() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MEMBERS_NAV_HINT_SESSION_KEY, "1");
}

export function clearMembersNavHint() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MEMBERS_NAV_HINT_SESSION_KEY);
}

export function consumeMembersNavHint() {
  if (typeof window === "undefined") return false;
  const queued = sessionStorage.getItem(MEMBERS_NAV_HINT_SESSION_KEY) === "1";
  if (queued) {
    sessionStorage.removeItem(MEMBERS_NAV_HINT_SESSION_KEY);
  }
  return queued;
}
