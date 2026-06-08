import type { SocialProviderId } from "@/lib/integrations/types";
import type { StudioNode } from "@/lib/studio-pro/types";

export type ResolvedPublishMedia = {
  mediaUrl: string;
  mediaType: "image" | "video";
  nodeId?: string;
};

export function resolvePublishMediaFromNode(node: StudioNode): ResolvedPublishMedia | null {
  if (node.type === "video" && node.data.videoUrl) {
    return { mediaUrl: node.data.videoUrl, mediaType: "video", nodeId: node.id };
  }
  if (node.type === "image" && node.data.imageUrl) {
    return { mediaUrl: node.data.imageUrl, mediaType: "image", nodeId: node.id };
  }
  if (node.data.videoUrl) {
    return { mediaUrl: node.data.videoUrl, mediaType: "video", nodeId: node.id };
  }
  if (node.data.imageUrl) {
    return { mediaUrl: node.data.imageUrl, mediaType: "image", nodeId: node.id };
  }
  return null;
}

export function formatConnectedSocialAccounts(
  accounts: Array<{
    provider: SocialProviderId;
    username: string | null;
    displayName: string | null;
  }>,
) {
  if (accounts.length === 0) {
    return "No social accounts connected. Connect platforms in Settings → Integrations.";
  }

  return accounts
    .map((account) => {
      const label = account.displayName || account.username || account.provider;
      return `${account.provider}: ${label}`;
    })
    .join("\n");
}

export function resolvePublishToolPayload(
  args: Record<string, unknown>,
  nodes: StudioNode[],
):
  | {
      ok: true;
      mediaUrl: string;
      mediaType: "image" | "video";
      providers?: SocialProviderId[];
      caption?: string;
      subreddit?: string;
      nodeId?: string;
    }
  | { ok: false; message: string } {
  let mediaUrl = typeof args.mediaUrl === "string" ? args.mediaUrl : undefined;
  let mediaType =
    args.mediaType === "image" || args.mediaType === "video" ? args.mediaType : undefined;
  let nodeId: string | undefined;

  if (typeof args.nodeId === "string") {
    const node = nodes.find((item) => item.id === args.nodeId);
    if (!node) {
      return { ok: false, message: `Node ${args.nodeId} not found.` };
    }
    const resolved = resolvePublishMediaFromNode(node);
    if (!resolved) {
      return {
        ok: false,
        message: `Node ${node.id} has no generated image or video yet — run it first.`,
      };
    }
    mediaUrl = resolved.mediaUrl;
    mediaType = resolved.mediaType;
    nodeId = node.id;
  }

  if (!mediaUrl || (mediaType !== "image" && mediaType !== "video")) {
    return { ok: false, message: "Pass nodeId (with generated media) or mediaUrl + mediaType." };
  }

  const resolvedMediaType = mediaType;

  const providers = Array.isArray(args.providers)
    ? args.providers.filter(
        (value): value is SocialProviderId =>
          value === "instagram" ||
          value === "tiktok" ||
          value === "facebook" ||
          value === "reddit",
      )
    : undefined;

  return {
    ok: true,
    mediaUrl,
    mediaType: resolvedMediaType,
    providers: providers && providers.length > 0 ? providers : undefined,
    caption: typeof args.caption === "string" ? args.caption : undefined,
    subreddit: typeof args.subreddit === "string" ? args.subreddit : undefined,
    nodeId,
  };
}

export function formatPublishOutcomes(
  outcomes: Array<{ provider: string; ok: boolean; message: string; postUrl?: string }>,
) {
  return outcomes
    .map((outcome) => {
      const status = outcome.ok ? "ok" : "failed";
      const url = outcome.postUrl ? ` (${outcome.postUrl})` : "";
      return `${outcome.provider} [${status}]: ${outcome.message}${url}`;
    })
    .join("\n");
}
