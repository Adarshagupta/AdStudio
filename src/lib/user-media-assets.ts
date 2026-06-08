import "server-only";

import type { MediaAssetKind, MediaAssetSource, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ensurePublicMediaUrl } from "@/lib/media-url";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

export type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

export function studioKindToMediaAssetKind(kind: StudioUploadKind): MediaAssetKind {
  if (kind === "image") return "IMAGE";
  if (kind === "video") return "VIDEO";
  return "AUDIO";
}

export function mediaAssetKindToStudio(kind: MediaAssetKind): UserMediaAssetDto["kind"] {
  if (kind === "IMAGE") return "image";
  if (kind === "VIDEO") return "video";
  return "audio";
}

function toDto(record: {
  id: string;
  kind: MediaAssetKind;
  source: MediaAssetSource;
  url: string;
  name: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  byteSize: number | null;
  createdAt: Date;
}): UserMediaAssetDto {
  return {
    id: record.id,
    kind: mediaAssetKindToStudio(record.kind),
    source: record.source === "UPLOADED" ? "uploaded" : "generated",
    url: record.url,
    name: record.name,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    durationSec: record.durationSec,
    byteSize: record.byteSize,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function registerUserMediaAsset(input: {
  userId: string;
  workspaceId: string;
  kind: StudioUploadKind;
  source: MediaAssetSource;
  url: string;
  name?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  byteSize?: number | null;
}) {
  const rawUrl = input.url.trim();
  if (!rawUrl) return null;

  const url = await ensurePublicMediaUrl({
    url: rawUrl,
    userId: input.userId,
    kind: input.kind,
  });

  const record = await prisma.userMediaAsset.upsert({
    where: {
      userId_url: {
        userId: input.userId,
        url,
      },
    },
    create: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      kind: studioKindToMediaAssetKind(input.kind),
      source: input.source,
      url,
      name: input.name?.trim() || null,
      mimeType: input.mimeType?.trim() || null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationSec: input.durationSec ?? null,
      byteSize: input.byteSize ?? null,
    },
    update: {
      name: input.name?.trim() || undefined,
      mimeType: input.mimeType?.trim() || undefined,
      width: input.width ?? undefined,
      height: input.height ?? undefined,
      durationSec: input.durationSec ?? undefined,
      byteSize: input.byteSize ?? undefined,
      source: input.source,
    },
  });

  return toDto(record);
}

export async function listUserMediaAssets(
  userId: string,
  options?: {
    kind?: StudioUploadKind;
    source?: "uploaded" | "generated";
    limit?: number;
    cursor?: string;
  },
) {
  const take = Math.min(100, Math.max(1, options?.limit ?? 48));

  const where: Prisma.UserMediaAssetWhereInput = { userId };

  if (options?.kind) {
    where.kind = studioKindToMediaAssetKind(options.kind);
  }

  if (options?.source === "uploaded") {
    where.source = "UPLOADED";
  } else if (options?.source === "generated") {
    where.source = "GENERATED";
  }

  const records = await prisma.userMediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(options?.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = records.length > take;
  const items = records.slice(0, take).map(toDto);

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function deleteUserMediaAsset(userId: string, assetId: string) {
  const deleted = await prisma.userMediaAsset.deleteMany({
    where: { id: assetId, userId },
  });
  return deleted.count > 0;
}
