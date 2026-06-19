import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { deductCredits, isBillingCreditsError } from "@/lib/billing/credits";
import { listConnectedSocialAccounts } from "@/lib/integrations/connection-access";
import { buildPublishPlan, publishToSocialProviders, resolvePublishProviders } from "@/lib/integrations/publish";
import { isSocialProviderId, SOCIAL_PROVIDER_IDS } from "@/lib/integrations/types";
import { parseRequestJson } from "@/lib/http/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const publishSchema = z.object({
  providers: z.array(z.enum(SOCIAL_PROVIDER_IDS as unknown as [string, ...string[]])).optional(),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]),
  caption: z.string().max(2200).optional(),
  subreddit: z.string().max(80).optional(),
  dryRun: z.boolean().optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageIntegrations") && !currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accounts = await listConnectedSocialAccounts(currentUser.workspace.id);

  return NextResponse.json({
    accounts,
    providers: accounts.map((account) => account.provider),
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageIntegrations") && !currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  const parsed = publishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const providers = (parsed.data.providers ?? []).filter(isSocialProviderId);
  const resolved = await resolvePublishProviders(currentUser.workspace.id, providers);

  if (parsed.data.dryRun) {
    return NextResponse.json({
      plan: buildPublishPlan(resolved, parsed.data.mediaType, parsed.data.caption),
      providers: resolved,
    });
  }

  const cost = 1;

  const outcomes = await publishToSocialProviders({
    workspaceId: currentUser.workspace.id,
    providers: resolved,
    mediaUrl: parsed.data.mediaUrl,
    mediaType: parsed.data.mediaType,
    caption: parsed.data.caption,
    subreddit: parsed.data.subreddit,
  });

  const succeeded = outcomes.filter((outcome) => outcome.ok);
  const failed = outcomes.filter((outcome) => !outcome.ok);

  if (succeeded.length > 0) {
    try {
      await deductCredits(currentUser.workspace.id, cost);
    } catch (error) {
      if (isBillingCreditsError(error)) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    message:
      failed.length === 0
        ? `Published to ${succeeded.length} channel${succeeded.length === 1 ? "" : "s"}.`
        : `Published to ${succeeded.length}; ${failed.length} failed.`,
    outcomes,
  });
}
