import type { GenerationFormat } from "@prisma/client";

import {
  clampVideoDuration,
  normalizeStudioVideoAspectRatio,
  normalizeStudioVideoResolution,
  resolveWaveSpeedVideoRoute,
  WAVESPEED_DEFAULT_VIDEO_MODEL,
  type StudioVideoOperation,
  type WaveSpeedVideoResolution,
} from "@/lib/wavespeed-video-models";
import {
  buildDashboardVideoPrompt,
  buildStrictStudioVideoPrompt,
  fitProviderVideoPrompt,
} from "@/lib/video-prompt";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";

export { WAVESPEED_DEFAULT_VIDEO_MODEL };

type WaveSpeedJobRef =
  | { provider: "wavespeed"; kind: "sync"; videoUrl: string }
  | { provider: "wavespeed"; kind: "async"; taskId: string };

type WaveSpeedResponse<T> = {
  code?: number;
  message?: string;
  data?: T;
};

type WaveSpeedTaskData = {
  id?: string;
  status?: string;
  outputs?: string[];
  error?: string;
  urls?: { get?: string };
};

function getApiKey() {
  const key = process.env.WAVESPEED_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "WAVESPEED_API_KEY is required for video generation. Get a key at https://wavespeed.ai/accesskey",
    );
  }
  return key;
}

function resolveVideoModel(override?: string | null) {
  const configured = process.env.WAVESPEED_VIDEO_MODEL?.trim();
  const candidate = override?.trim();
  if (candidate && candidate.includes("/")) {
    return candidate.replace(/^\//, "");
  }
  return configured || WAVESPEED_DEFAULT_VIDEO_MODEL;
}

export function encodeWaveSpeedJob(ref: WaveSpeedJobRef) {
  return JSON.stringify(ref);
}

export function decodeWaveSpeedJob(requestId: string): WaveSpeedJobRef {
  try {
    const parsed = JSON.parse(requestId) as WaveSpeedJobRef;
    if (parsed.provider === "wavespeed" && (parsed.kind === "sync" || parsed.kind === "async")) {
      return parsed;
    }
  } catch {
    // Legacy Cloudflare async ids stored as plain strings.
  }

  throw new Error("Invalid WaveSpeed job reference.");
}

async function wavespeedRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${WAVESPEED_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let payload: WaveSpeedResponse<T> | null = null;
  try {
    payload = (await response.json()) as WaveSpeedResponse<T>;
  } catch {
    if (!response.ok) {
      throw new Error(`WaveSpeed request failed (${response.status}).`);
    }
    throw new Error("WaveSpeed returned an unexpected response.");
  }

  if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
    throw new Error(payload.message ?? `WaveSpeed request failed (${response.status}).`);
  }

  return payload;
}

function extractVideoUrl(data: WaveSpeedTaskData | undefined) {
  const output = data?.outputs?.[0];
  if (typeof output === "string" && (output.startsWith("http://") || output.startsWith("https://"))) {
    return output;
  }
  return undefined;
}

function mapWaveSpeedStatus(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "completed" || normalized === "succeeded" || normalized === "success") {
    return "done" as const;
  }
  if (normalized === "failed" || normalized === "error" || normalized === "cancelled") {
    return "failed" as const;
  }
  return "pending" as const;
}

function buildWaveSpeedRequestBody(input: {
  videoPrompt: string;
  route: ReturnType<typeof resolveWaveSpeedVideoRoute>;
  duration: number;
  resolution: WaveSpeedVideoResolution;
  aspectRatio?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
}) {
  const { spec } = input.route;
  const seed = -1;
  const images = (input.referenceImageUrls?.length
    ? input.referenceImageUrls
    : input.referenceImageUrl
      ? [input.referenceImageUrl]
      : []
  ).filter(Boolean);

  switch (spec.mode) {
    case "video-control": {
      if (!input.referenceVideoUrl) {
        throw new Error("Video control requires a connected video clip.");
      }
      const body: Record<string, unknown> = {
        video: input.referenceVideoUrl,
        prompt: input.videoPrompt,
        mode: "pose",
        audio_mode: "generate",
        resolution: input.resolution,
        seed,
      };
      if (images[0]) body.image = images[0];
      return body;
    }
    case "video-edit": {
      if (!input.referenceVideoUrl) {
        throw new Error("Edit video requires a connected video clip.");
      }
      return {
        video: input.referenceVideoUrl,
        prompt: input.videoPrompt,
        resolution: input.resolution,
      };
    }
    case "video-extend": {
      if (!input.referenceVideoUrl) {
        throw new Error("Extend video requires a connected video clip.");
      }
      return {
        video: input.referenceVideoUrl,
        prompt: input.videoPrompt,
        duration: input.duration,
      };
    }
    case "reference-to-video": {
      if (images.length < 2) {
        throw new Error("Reference-to-video needs at least two connected images.");
      }
      return {
        images,
        prompt: input.videoPrompt,
        resolution: input.resolution,
        duration: input.duration,
      };
    }
    case "image-to-video": {
      if (!images[0]) {
        throw new Error("Image-to-video requires a connected image.");
      }
      const body: Record<string, unknown> = {
        image: images[0],
        prompt: input.videoPrompt,
        resolution: input.resolution,
        duration: input.duration,
      };
      if (spec.provider === "ltx") body.seed = seed;
      return body;
    }
    case "text-to-video": {
      const aspectRatio = normalizeStudioVideoAspectRatio(input.aspectRatio, spec);
      const body: Record<string, unknown> = {
        prompt: input.videoPrompt,
        resolution: input.resolution,
        duration: input.duration,
      };
      if (aspectRatio) body.aspect_ratio = aspectRatio;
      if (spec.provider === "ltx") body.seed = seed;
      return body;
    }
    default:
      throw new Error("Unsupported video model mode.");
  }
}

export async function startVideoGeneration(input: {
  prompt: string;
  scriptText: string;
  format: GenerationFormat;
  model?: string;
  adhereToScript?: boolean;
  shotNotes?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
  videoOperation?: StudioVideoOperation;
  style?: {
    aspectRatio?: string;
    duration?: number;
    resolution?: string;
    captionStyle?: string;
    musicEnabled?: boolean;
  };
}) {
  const referenceImageUrls =
    input.referenceImageUrls?.filter(Boolean) ??
    (input.referenceImageUrl ? [input.referenceImageUrl] : []);

  const route = resolveWaveSpeedVideoRoute({
    modelOverride: input.model,
    referenceImageUrl: referenceImageUrls[0],
    referenceImageUrls,
    referenceVideoUrl: input.referenceVideoUrl,
    videoOperation: input.videoOperation,
  });

  const model = route.modelId;
  const duration = clampVideoDuration(input.style?.duration, route.spec);
  const resolution = normalizeStudioVideoResolution(input.style?.resolution, route.spec);
  const aspectRatio = normalizeStudioVideoAspectRatio(input.style?.aspectRatio, route.spec);

  const rawVideoPrompt = input.adhereToScript
    ? buildStrictStudioVideoPrompt({
        format: input.format,
        scriptText: input.scriptText,
        visualDirection: input.prompt,
        shotNotes: input.shotNotes,
        captionStyle: input.style?.captionStyle,
        musicEnabled: input.style?.musicEnabled,
        hasReferenceImage: referenceImageUrls.length > 0,
        hasReferenceVideo: Boolean(input.referenceVideoUrl),
        videoMode: route.spec.mode,
      })
    : buildDashboardVideoPrompt({
        format: input.format,
        scriptText: input.scriptText,
        prompt: input.prompt,
        captionStyle: input.style?.captionStyle,
        musicEnabled: input.style?.musicEnabled,
      });

  const videoPrompt = fitProviderVideoPrompt(rawVideoPrompt);

  const body = buildWaveSpeedRequestBody({
    videoPrompt,
    route,
    duration,
    resolution,
    aspectRatio,
    referenceImageUrl: referenceImageUrls[0],
    referenceImageUrls,
    referenceVideoUrl: input.referenceVideoUrl,
  });

  const result = await wavespeedRequest<WaveSpeedTaskData>(`/${model}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = result.data;
  const videoUrl = extractVideoUrl(data);

  if (videoUrl) {
    return {
      requestId: encodeWaveSpeedJob({ provider: "wavespeed", kind: "sync", videoUrl }),
      videoUrl,
      duration,
      aspectRatio: aspectRatio ?? "from-input",
      resolution,
      model,
      mode: route.spec.mode,
    };
  }

  const taskId = data?.id;
  if (!taskId) {
    throw new Error("WaveSpeed did not return a task id or video URL.");
  }

  return {
    requestId: encodeWaveSpeedJob({ provider: "wavespeed", kind: "async", taskId }),
    duration,
    aspectRatio: aspectRatio ?? "from-input",
    resolution,
    model,
    mode: route.spec.mode,
  };
}

export async function pollVideoGeneration(requestId: string) {
  let ref: WaveSpeedJobRef;

  try {
    ref = decodeWaveSpeedJob(requestId);
  } catch {
    const { pollCloudflareVideoGeneration } = await import("@/lib/cloudflare-ai");
    return pollCloudflareVideoGeneration(requestId);
  }

  if (ref.kind === "sync") {
    return {
      status: "done" as const,
      videoUrl: ref.videoUrl,
      durationSec: undefined,
      raw: ref,
    };
  }

  const result = await wavespeedRequest<WaveSpeedTaskData>(
    `/predictions/${ref.taskId}/result`,
    { method: "GET" },
  );

  const data = result.data;
  const videoUrl = extractVideoUrl(data);
  const mapped = mapWaveSpeedStatus(data?.status);

  if (mapped === "done" && videoUrl) {
    return {
      status: "done" as const,
      videoUrl,
      durationSec: undefined,
      raw: data,
    };
  }

  if (mapped === "failed") {
    return {
      status: "failed" as const,
      videoUrl: undefined,
      durationSec: undefined,
      raw: data,
    };
  }

  return {
    status: "pending" as const,
    videoUrl: undefined,
    durationSec: undefined,
    raw: data,
  };
}

export function getConfiguredWaveSpeedVideoModel() {
  return resolveVideoModel();
}
