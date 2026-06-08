import type { GenerationFormat } from "@prisma/client";

import {
  clampVideoDuration,
  LTX_DEFAULT_VIDEO_MODEL,
  normalizeStudioVideoAspectRatio,
  normalizeStudioVideoResolution,
  resolveLtxVideoRoute,
  toLtxApiResolution,
  type LtxVideoModelSpec,
} from "@/lib/ltx-video-models";
import {
  buildDashboardVideoPrompt,
  buildStrictStudioVideoPrompt,
  fitProviderVideoPrompt,
} from "@/lib/video-prompt";

const LTX_API_BASE = "https://api.ltx.video";

export { LTX_DEFAULT_VIDEO_MODEL };

type LtxEndpoint = "text-to-video" | "image-to-video" | "retake" | "extend";

type LtxJobRef = {
  provider: "ltx";
  endpoint: LtxEndpoint;
  jobId: string;
  keyIndex?: number;
};

class LtxRequestError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "LtxRequestError";
    this.status = status;
    this.retryable = retryable;
  }
}

type LtxJobCreatedResponse = {
  id: string;
  created_at?: string;
};

type LtxJobStatusResponse = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: { video_url?: string };
  error?: { type?: string; message?: string };
};

export function getLtxApiKeys() {
  const keys: string[] = [];
  const primary = process.env.LTX_API_KEY?.trim();
  if (primary) keys.push(primary);

  const extras = process.env.LTX_API_KEYS?.trim();
  if (extras) {
    for (const part of extras.split(/[\n,]+/)) {
      const key = part.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }

  return keys;
}

function getApiKey(index = 0) {
  const keys = getLtxApiKeys();
  const key = keys[index];
  if (!key) {
    throw new Error(
      "LTX_API_KEY is required for video generation. Get a key at https://console.ltx.video",
    );
  }
  return key;
}

function isRetryableLtxStatus(status: number) {
  return status === 401 || status === 402 || status === 429 || status === 503;
}

export function isInsufficientFundsError(
  message?: string,
  errorType?: string,
  status?: number,
) {
  const haystack = `${message ?? ""} ${errorType ?? ""}`.toLowerCase();
  return (
    status === 402 ||
    errorType === "insufficient_funds_error" ||
    haystack.includes("insufficient funds") ||
    haystack.includes("insufficient_funds") ||
    haystack.includes("out of credits") ||
    haystack.includes("not enough credits") ||
    haystack.includes("payment required")
  );
}

function isRetryableLtxError(message: string, errorType?: string, status?: number) {
  return (
    isRetryableLtxStatus(status ?? 0) || isInsufficientFundsError(message, errorType, status)
  );
}

function resolveVideoModel(override?: string | null) {
  const configured = process.env.LTX_VIDEO_MODEL?.trim();
  const candidate = override?.trim();
  if (candidate) return candidate;
  return configured || LTX_DEFAULT_VIDEO_MODEL;
}

export function encodeLtxJob(ref: LtxJobRef) {
  return JSON.stringify(ref);
}

export function decodeLtxJob(requestId: string): LtxJobRef {
  const parsed = JSON.parse(requestId) as LtxJobRef;
  if (parsed.provider === "ltx" && parsed.jobId && parsed.endpoint) {
    return parsed;
  }
  throw new Error("Invalid LTX job reference.");
}

async function ltxRequestWithKey<T>(path: string, apiKey: string, init?: RequestInit) {
  const response = await fetch(`${LTX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as {
        message?: string;
        error?: { type?: string; message?: string };
      };
      const message =
        payload.error?.message ?? payload.message ?? `LTX request failed (${response.status}).`;
      const retryable = isRetryableLtxError(
        message,
        payload.error?.type,
        response.status,
      );
      throw new LtxRequestError(message, response.status, retryable);
    }
    throw new LtxRequestError(
      `LTX request failed (${response.status}).`,
      response.status,
      isRetryableLtxStatus(response.status),
    );
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  throw new Error("LTX returned an unexpected response.");
}

async function ltxRequestWithFallback<T>(
  path: string,
  init?: RequestInit,
  options?: { startKeyIndex?: number },
) {
  const keys = getLtxApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "LTX_API_KEY is required for video generation. Get a key at https://console.ltx.video",
    );
  }

  const startIndex = Math.min(
    Math.max(0, options?.startKeyIndex ?? 0),
    keys.length - 1,
  );
  let lastError: Error | null = null;

  for (let index = startIndex; index < keys.length; index += 1) {
    try {
      const data = await ltxRequestWithKey<T>(path, keys[index], init);
      return { data, keyIndex: index };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("LTX request failed.");
      const retryable = error instanceof LtxRequestError && error.retryable;
      if (!retryable || index === keys.length - 1) {
        throw lastError;
      }
      console.warn(`[ltx] key ${index + 1}/${keys.length} failed, trying next key…`);
    }
  }

  throw lastError ?? new Error("LTX request failed.");
}

function mapLtxStatus(status?: string) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "completed") return "done" as const;
  if (normalized === "failed") return "failed" as const;
  return "pending" as const;
}

function buildLtxRequestBody(input: {
  videoPrompt: string;
  spec: LtxVideoModelSpec;
  duration: number;
  resolution: ReturnType<typeof normalizeStudioVideoResolution>;
  aspectRatio?: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  musicEnabled?: boolean;
}) {
  const apiResolution = toLtxApiResolution(input.resolution, input.aspectRatio);
  const generateAudio = input.musicEnabled !== false;

  switch (input.spec.endpoint) {
    case "text-to-video":
      return {
        prompt: input.videoPrompt,
        model: input.spec.apiModel,
        duration: input.duration,
        resolution: apiResolution,
        generate_audio: generateAudio,
      };
    case "image-to-video": {
      if (!input.referenceImageUrl) {
        throw new Error("Image-to-video requires a connected image.");
      }
      return {
        image_uri: input.referenceImageUrl,
        prompt: input.videoPrompt,
        model: input.spec.apiModel,
        duration: input.duration,
        resolution: apiResolution,
        generate_audio: generateAudio,
      };
    }
    case "retake": {
      if (!input.referenceVideoUrl) {
        throw new Error("Retake requires a connected video clip.");
      }
      return {
        video_uri: input.referenceVideoUrl,
        prompt: input.videoPrompt,
        start_time: 0,
        duration: input.duration,
        mode: "replace_audio_and_video",
        model: input.spec.apiModel,
        resolution: apiResolution,
      };
    }
    case "extend": {
      if (!input.referenceVideoUrl) {
        throw new Error("Extend video requires a connected video clip.");
      }
      return {
        video_uri: input.referenceVideoUrl,
        prompt: input.videoPrompt,
        duration: input.duration,
        mode: "end",
        model: input.spec.apiModel,
      };
    }
    default:
      throw new Error("Unsupported LTX video endpoint.");
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
  videoOperation?: "auto" | "edit" | "extend" | "control";
  startKeyIndex?: number;
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

  const route = resolveLtxVideoRoute({
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

  const body = buildLtxRequestBody({
    videoPrompt,
    spec: route.spec,
    duration,
    resolution,
    aspectRatio,
    referenceImageUrl: referenceImageUrls[0],
    referenceVideoUrl: input.referenceVideoUrl,
    musicEnabled: input.style?.musicEnabled,
  });

  const { data: created, keyIndex } = await ltxRequestWithFallback<LtxJobCreatedResponse>(
    `/v2/${route.spec.endpoint}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    { startKeyIndex: input.startKeyIndex },
  );

  if (!created.id) {
    throw new Error("LTX did not return a job id.");
  }

  return {
    requestId: encodeLtxJob({
      provider: "ltx",
      endpoint: route.spec.endpoint,
      jobId: created.id,
      keyIndex,
    }),
    videoUrl: undefined,
    duration,
    aspectRatio: aspectRatio ?? "from-input",
    resolution,
    model,
    mode: route.spec.mode,
  };
}

export async function pollVideoGeneration(requestId: string) {
  let ref: LtxJobRef;

  try {
    ref = decodeLtxJob(requestId);
  } catch {
    const { pollVideoGeneration: pollWaveSpeed } = await import("@/lib/wavespeed-ai");
    return pollWaveSpeed(requestId);
  }

  const status = await ltxRequestWithKey<LtxJobStatusResponse>(
    `/v2/${ref.endpoint}/${ref.jobId}`,
    getApiKey(ref.keyIndex ?? 0),
    { method: "GET" },
  );

  const mapped = mapLtxStatus(status.status);
  const videoUrl = status.result?.video_url;

  if (mapped === "done" && videoUrl) {
    return {
      status: "done" as const,
      videoUrl,
      durationSec: undefined,
      raw: status,
    };
  }

  if (mapped === "failed") {
    const message = status.error?.message?.trim();
    const insufficientFunds = isInsufficientFundsError(
      message,
      status.error?.type,
    );
    return {
      status: "failed" as const,
      videoUrl: undefined,
      durationSec: undefined,
      errorMessage: message || "Video generation failed.",
      insufficientFunds,
      keyIndex: ref.keyIndex ?? 0,
      raw: status,
    };
  }

  return {
    status: "pending" as const,
    videoUrl: undefined,
    durationSec: undefined,
    raw: status,
  };
}

export function getConfiguredLtxVideoModel() {
  return resolveVideoModel();
}

export function getConfiguredLtxApiKeyCount() {
  return getLtxApiKeys().length;
}

type StoredGenerationVideoInput = {
  prompt: string;
  scriptText: string | null;
  format: GenerationFormat;
  thumbnailUrl: string | null;
  style: unknown;
};

export async function restartVideoGenerationWithNextKey(input: {
  generation: StoredGenerationVideoInput;
  currentKeyIndex: number;
}) {
  const nextKeyIndex = input.currentKeyIndex + 1;
  const keys = getLtxApiKeys();

  if (nextKeyIndex >= keys.length) {
    return null;
  }

  const style = (input.generation.style ?? {}) as {
    aspectRatio?: string;
    duration?: number;
    resolution?: string;
    captionStyle?: string;
    musicEnabled?: boolean;
  };

  console.warn(
    `[ltx] insufficient funds on key ${input.currentKeyIndex + 1}/${keys.length}, retrying with key ${nextKeyIndex + 1}…`,
  );

  return startVideoGeneration({
    prompt: input.generation.prompt,
    scriptText: input.generation.scriptText ?? "",
    format: input.generation.format,
    adhereToScript: Boolean(input.generation.thumbnailUrl),
    referenceImageUrl: input.generation.thumbnailUrl ?? undefined,
    style,
    startKeyIndex: nextKeyIndex,
  });
}
