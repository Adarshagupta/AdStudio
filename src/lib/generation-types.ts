import type { GenerationFormat, GenerationStatus } from "@prisma/client";

import { getGenerationOutputType, type DashboardOutputType } from "@/lib/dashboard-generation";

export type { GenerationFormat, GenerationStatus };

export type GenerationListItem = {
  id: string;
  title: string;
  type: GenerationFormat;
  outputType: DashboardOutputType;
  status: GenerationStatus;
  timestamp: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
};

export function toGenerationListItem(generation: {
  id: string;
  prompt: string;
  format: GenerationFormat;
  status: GenerationStatus;
  createdAt: Date;
  style?: unknown;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
}): GenerationListItem {
  return {
    id: generation.id,
    title: generation.prompt || "Untitled generation",
    type: generation.format,
    outputType: getGenerationOutputType(generation.style),
    status: generation.status,
    timestamp: formatRelativeTime(generation.createdAt),
    videoUrl: generation.videoUrl,
    thumbnailUrl: generation.thumbnailUrl,
    durationSec: generation.durationSec,
  };
}

export function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
