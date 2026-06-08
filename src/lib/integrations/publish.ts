import "server-only";

import { getSocialConnectionWithToken } from "@/lib/integrations/connection-access";
import { listIntegrationStatuses } from "@/lib/integrations/connections";
import type { SocialProviderId } from "@/lib/integrations/types";
import { SOCIAL_PROVIDER_IDS } from "@/lib/integrations/types";

export type SocialMediaType = "image" | "video";

export type SocialPublishRequest = {
  workspaceId: string;
  providers: SocialProviderId[];
  mediaUrl: string;
  mediaType: SocialMediaType;
  caption?: string;
  subreddit?: string;
};

export type SocialPublishOutcome = {
  provider: SocialProviderId;
  ok: boolean;
  message: string;
  postId?: string;
  postUrl?: string;
};

async function parseJsonResponse<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string } | string;
    message?: string;
  };

  if (!response.ok) {
    const message =
      (typeof data.error === "object" ? data.error?.message : data.error) ||
      data.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function publishInstagram(input: SocialPublishRequest, accessToken: string, igUserId: string) {
  const caption = input.caption?.trim() || "Created with Studio Pro";
  const isVideo = input.mediaType === "video";

  const mediaParams = new URLSearchParams({
    access_token: accessToken,
    caption,
  });

  if (isVideo) {
    mediaParams.set("media_type", "REELS");
    mediaParams.set("video_url", input.mediaUrl);
  } else {
    mediaParams.set("image_url", input.mediaUrl);
  }

  const createResponse = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    body: mediaParams,
  });
  const created = await parseJsonResponse<{ id: string }>(createResponse);

  const publishResponse = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      access_token: accessToken,
      creation_id: created.id,
    }),
  });
  const published = await parseJsonResponse<{ id: string }>(publishResponse);

  return {
    provider: "instagram" as const,
    ok: true,
    message: isVideo ? "Published reel to Instagram." : "Published image to Instagram.",
    postId: published.id,
  };
}

async function publishFacebook(input: SocialPublishRequest, accessToken: string) {
  const caption = input.caption?.trim() || "Created with Studio Pro";
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`,
  );
  const accounts = await parseJsonResponse<{
    data?: Array<{ id: string; name?: string; access_token?: string }>;
  }>(accountsResponse);

  const page = accounts.data?.find((item) => item.access_token);
  if (!page?.access_token) {
    throw new Error("No Facebook page with publish access found. Connect a page admin account.");
  }

  const params = new URLSearchParams({
    access_token: page.access_token,
    message: caption,
  });

  if (input.mediaType === "video") {
    params.set("file_url", input.mediaUrl);
    const response = await fetch(`https://graph.facebook.com/v21.0/${page.id}/videos`, {
      method: "POST",
      body: params,
    });
    const data = await parseJsonResponse<{ id: string }>(response);
    return {
      provider: "facebook" as const,
      ok: true,
      message: `Published video to Facebook page ${page.name ?? page.id}.`,
      postId: data.id,
    };
  }

  params.set("url", input.mediaUrl);
  params.set("published", "true");
  const response = await fetch(`https://graph.facebook.com/v21.0/${page.id}/photos`, {
    method: "POST",
    body: params,
  });
  const data = await parseJsonResponse<{ id: string; post_id?: string }>(response);

  return {
    provider: "facebook" as const,
    ok: true,
    message: `Published image to Facebook page ${page.name ?? page.id}.`,
    postId: data.post_id ?? data.id,
  };
}

async function publishReddit(
  input: SocialPublishRequest,
  accessToken: string,
  connection: { username: string | null; profileMeta: Record<string, unknown> | null },
) {
  const subreddit =
    input.subreddit?.trim() ||
    (typeof connection.profileMeta?.defaultSubreddit === "string"
      ? connection.profileMeta.defaultSubreddit
      : "") ||
    connection.username;

  if (!subreddit) {
    throw new Error("Reddit needs a subreddit — pass subreddit in the publish request.");
  }

  const title = (input.caption?.trim() || "Studio Pro post").slice(0, 300);
  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "ugc-platform/1.0",
    },
    body: new URLSearchParams({
      sr: subreddit.replace(/^r\//, ""),
      kind: "link",
      title,
      url: input.mediaUrl,
      resubmit: "true",
    }),
  });

  const data = await parseJsonResponse<{
    json?: { errors?: string[][]; data?: { url?: string; id?: string } };
  }>(response);

  const errors = data.json?.errors?.flat().filter(Boolean) ?? [];
  if (errors.length > 0) {
    throw new Error(errors.join(" · "));
  }

  return {
    provider: "reddit" as const,
    ok: true,
    message: `Submitted link post to r/${subreddit.replace(/^r\//, "")}.`,
    postUrl: data.json?.data?.url,
    postId: data.json?.data?.id,
  };
}

async function publishTikTok() {
  return {
    provider: "tiktok" as const,
    ok: false,
    message:
      "TikTok posting needs the video.publish scope. Reconnect TikTok in Settings → Integrations to enable publishing.",
  };
}

export async function resolvePublishProviders(
  workspaceId: string,
  providers?: SocialProviderId[],
): Promise<SocialProviderId[]> {
  const statuses = await listIntegrationStatuses(workspaceId);
  const connected = statuses.filter((status) => status.connected).map((status) => status.provider);

  if (!providers || providers.length === 0) {
    return connected;
  }

  return providers.filter((provider) => connected.includes(provider));
}

export function buildPublishPlan(
  providers: SocialProviderId[],
  mediaType: SocialMediaType,
  caption?: string,
) {
  const labels = providers.map((provider) => provider.charAt(0).toUpperCase() + provider.slice(1)).join(", ");
  return [
    `Publish ${mediaType} to ${providers.length} connected channel${providers.length === 1 ? "" : "s"}: ${labels}.`,
    caption?.trim() ? `Caption: ${caption.trim().slice(0, 120)}${caption.length > 120 ? "…" : ""}` : null,
    "This goes live on the selected social accounts.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function publishToSocialProviders(
  request: SocialPublishRequest,
): Promise<SocialPublishOutcome[]> {
  const targets =
    request.providers.length > 0
      ? request.providers
      : await resolvePublishProviders(request.workspaceId);

  if (targets.length === 0) {
    return [
      {
        provider: "instagram",
        ok: false,
        message: "No connected social accounts. Connect platforms in Settings → Integrations.",
      },
    ];
  }

  const outcomes: SocialPublishOutcome[] = [];

  for (const provider of targets) {
    if (!SOCIAL_PROVIDER_IDS.includes(provider)) continue;

    try {
      const connection = await getSocialConnectionWithToken(request.workspaceId, provider);
      if (!connection) {
        outcomes.push({
          provider,
          ok: false,
          message: `${provider} is not connected.`,
        });
        continue;
      }

      if (provider === "instagram") {
        outcomes.push(
          await publishInstagram(request, connection.accessToken, connection.externalId),
        );
        continue;
      }

      if (provider === "facebook") {
        outcomes.push(await publishFacebook(request, connection.accessToken));
        continue;
      }

      if (provider === "reddit") {
        outcomes.push(
          await publishReddit(request, connection.accessToken, {
            username: connection.username,
            profileMeta: connection.profileMeta,
          }),
        );
        continue;
      }

      if (provider === "tiktok") {
        outcomes.push(await publishTikTok());
        continue;
      }

      outcomes.push({ provider, ok: false, message: `Unsupported provider: ${provider}` });
    } catch (error) {
      outcomes.push({
        provider,
        ok: false,
        message: error instanceof Error ? error.message : "Publish failed.",
      });
    }
  }

  return outcomes;
}
