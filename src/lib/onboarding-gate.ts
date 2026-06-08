import "server-only";

import { isWorkspaceOnboardingComplete } from "@/lib/onboarding";
import { cacheDel, cacheGet, cacheSet } from "@/lib/redis-cache";

const ONBOARDING_CACHE_TTL_SECONDS = 120;

export async function isWorkspaceOnboardingCompleteCached(workspaceId: string) {
  const cached = await cacheGet<boolean>("onboarding-complete", workspaceId);
  if (cached !== null) {
    return cached;
  }

  const complete = await isWorkspaceOnboardingComplete(workspaceId);
  void cacheSet("onboarding-complete", workspaceId, complete, ONBOARDING_CACHE_TTL_SECONDS);
  return complete;
}

export function invalidateOnboardingCache(workspaceId: string) {
  void cacheDel("onboarding-complete", workspaceId);
}
