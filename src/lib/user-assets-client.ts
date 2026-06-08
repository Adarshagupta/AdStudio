import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

export type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

export async function fetchUserAssets(options?: {
  kind?: StudioUploadKind;
  source?: "uploaded" | "generated";
  limit?: number;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  if (options?.kind) params.set("kind", options.kind);
  if (options?.source) params.set("source", options.source);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);

  const query = params.toString();
  const response = await fetch(`/api/assets${query ? `?${query}` : ""}`, { cache: "no-store" });
  const data = await readJsonResponse<{
    items?: UserMediaAssetDto[];
    nextCursor?: string | null;
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Could not load assets."));
  }

  return {
    items: data.items ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

export async function registerUserAsset(input: {
  url: string;
  kind: StudioUploadKind;
  source?: "uploaded" | "generated";
  name?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  byteSize?: number;
}) {
  const response = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await readJsonResponse<{ asset?: UserMediaAssetDto; error?: string }>(response);
  if (!response.ok || !data.asset) {
    throw new Error(responseErrorMessage(response, data, "Could not save asset to library."));
  }

  return data.asset;
}

/** Best-effort — never blocks uploads or generation. */
export function registerUserAssetQuiet(input: Parameters<typeof registerUserAsset>[0]) {
  void registerUserAsset(input).catch(() => undefined);
}

export async function deleteUserAsset(assetId: string) {
  const response = await fetch(`/api/assets?id=${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  });
  const data = await readJsonResponse<{ error?: string }>(response);
  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Could not delete asset."));
  }
}
