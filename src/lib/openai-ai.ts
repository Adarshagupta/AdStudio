import "server-only";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { GenerationFormat } from "@prisma/client";

import { resizeImageToExactSize } from "@/lib/image-resize";
import {
  buildDashboardVideoPrompt,
  buildStrictStudioVideoPrompt,
  fitProviderVideoPrompt,
  PROVIDER_VIDEO_PROMPT_MAX_CHARS,
} from "@/lib/video-prompt";
import { getAppUrl } from "@/lib/integrations/app-url";
import { putR2Object, studioUploadUsesR2 } from "@/lib/r2";
import { stripEmbeddedMediaUrls } from "@/lib/text-prompt";
import {
  isOpenAIVideoModel,
  resolveOpenAIImageModel,
  resolveOpenAIVideoModel,
} from "@/lib/openai-models";

const OPENAI_API_BASE = "https://api.openai.com/v1";

type OpenAIJobRef = {
  provider: "openai";
  videoId: string;
  model: string;
};

type OpenAIVideoJob = {
  id: string;
  status?: string;
  error?: { message?: string };
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

function getApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is required for OpenAI image/video generation. Add it to .env or choose a free model.",
    );
  }
  return key;
}

export function encodeOpenAIJob(ref: OpenAIJobRef) {
  return JSON.stringify(ref);
}

export function decodeOpenAIJob(requestId: string): OpenAIJobRef {
  const parsed = JSON.parse(requestId) as OpenAIJobRef;
  if (parsed.provider === "openai" && parsed.videoId) {
    return parsed;
  }
  throw new Error("Invalid OpenAI job reference.");
}

const GPT_IMAGE_MAX_PROMPT_CHARS = 1_000;
const DALLE_MAX_PROMPT_CHARS = 4_000;
function isGptImageApiModel(apiModel: string) {
  return apiModel === "gpt-image-1" || apiModel.startsWith("gpt-image-");
}

function sanitizeOpenAIVideoPrompt(prompt: string) {
  return fitProviderVideoPrompt(prompt, PROVIDER_VIDEO_PROMPT_MAX_CHARS);
}

function sanitizeOpenAIImagePrompt(prompt: string, apiModel: string) {
  const maxChars = isGptImageApiModel(apiModel)
    ? GPT_IMAGE_MAX_PROMPT_CHARS
    : DALLE_MAX_PROMPT_CHARS;
  const cleaned = stripEmbeddedMediaUrls(prompt).replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxChars)}…`;
}

function imageSizeForAspectRatio(aspectRatio: string | undefined, apiModel: string) {
  if (isGptImageApiModel(apiModel)) {
    switch (aspectRatio) {
      case "16:9":
        return "1536x1024";
      case "1:1":
        return "1024x1024";
      case "9:16":
      default:
        return "1024x1536";
    }
  }

  switch (aspectRatio) {
    case "16:9":
      return "1792x1024";
    case "1:1":
      return "1024x1024";
    case "9:16":
    default:
      return "1024x1792";
  }
}

function buildImageGenerationBody(apiModel: string, prompt: string, size: string) {
  if (isGptImageApiModel(apiModel)) {
    return { model: apiModel, prompt };
  }

  return { model: apiModel, prompt, size };
}

function formatOpenAIImageError(error: unknown) {
  const message = error instanceof Error ? error.message : "Image generation failed.";
  const lower = message.toLowerCase();

  if (
    lower.includes("limit 0") ||
    lower.includes("input-images") ||
    lower.includes("payment method") ||
    lower.includes("billing") ||
    lower.includes("request too large")
  ) {
    return new Error(
      "OpenAI image models require billing on your OpenAI account. Add a payment method at https://platform.openai.com/account/billing.",
    );
  }

  if (lower.includes("does not exist")) {
    return new Error("This OpenAI image model is not enabled for your API key.");
  }

  return new Error(message);
}

async function normalizeOpenAIImageOutput(data: OpenAIImageResponse) {
  const item = data.data?.[0];
  if (!item) return null;

  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error(`Failed to download OpenAI image (${response.status}).`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  return null;
}

function videoSizeForAspectRatio(aspectRatio: string | undefined, apiModel: string) {
  const portrait = aspectRatio !== "16:9";
  if (apiModel === "sora-2-pro") {
    return portrait ? "1024x1792" : "1792x1024";
  }
  return portrait ? "720x1280" : "1280x720";
}

function clampOpenAISeconds(duration: number | undefined, spec: ReturnType<typeof resolveOpenAIVideoModel>) {
  const requested = Math.round(Number(duration ?? spec.defaultDuration));
  let nearest = spec.durations[0];
  let bestDelta = Math.abs(nearest - requested);
  for (const option of spec.durations) {
    const delta = Math.abs(option - requested);
    if (delta < bestDelta) {
      nearest = option;
      bestDelta = delta;
    }
  }
  return String(nearest) as "4" | "8" | "12";
}

async function openaiRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status}).`);
    }
    return (await response.arrayBuffer()) as T;
  }

  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI request failed (${response.status}).`);
  }

  return data;
}

async function requestOpenAIImage(apiModel: string, prompt: string, size: string) {
  const sanitizedPrompt = sanitizeOpenAIImagePrompt(prompt, apiModel);
  if (sanitizedPrompt.length < 3) {
    throw new Error("Image prompt needs at least 3 characters after cleanup.");
  }

  const data = await openaiRequest<OpenAIImageResponse>("/images/generations", {
    method: "POST",
    body: JSON.stringify(buildImageGenerationBody(apiModel, sanitizedPrompt, size)),
  });

  const imageUrl = await normalizeOpenAIImageOutput(data);
  if (!imageUrl) {
    throw new Error("OpenAI did not return an image.");
  }

  return { imageUrl };
}

export async function generateOpenAIImage(input: {
  prompt: string;
  model?: string;
  aspectRatio?: string;
}) {
  const apiModel = resolveOpenAIImageModel(input.model);
  const size = imageSizeForAspectRatio(input.aspectRatio, apiModel);

  try {
    return await requestOpenAIImage(apiModel, input.prompt, size);
  } catch (error) {
    throw formatOpenAIImageError(error);
  }
}

async function createOpenAIVideoJob(input: {
  apiModel: string;
  prompt: string;
  size: string;
  seconds: string;
  referenceImageUrl?: string;
}) {
  const sanitizedPrompt = sanitizeOpenAIVideoPrompt(input.prompt);

  if (input.referenceImageUrl) {
    const reference = await resizeImageToExactSize({
      url: input.referenceImageUrl,
      size: input.size,
      format: "jpeg",
    });

    const form = new FormData();
    form.append("model", input.apiModel);
    form.append("prompt", sanitizedPrompt);
    form.append("size", input.size);
    form.append("seconds", input.seconds);
    form.append(
      "input_reference",
      new Blob([Uint8Array.from(reference.buffer)], { type: reference.mime }),
      "reference.jpg",
    );

    const response = await fetch(`${OPENAI_API_BASE}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: form,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? ((await response.json()) as OpenAIVideoJob & { error?: { message?: string } })
      : null;

    if (!response.ok) {
      throw new Error(data?.error?.message ?? `OpenAI video request failed (${response.status}).`);
    }

    if (!data?.id) {
      throw new Error("OpenAI did not return a video job id.");
    }

    return data;
  }

  return openaiRequest<OpenAIVideoJob>("/videos", {
    method: "POST",
    body: JSON.stringify({
      model: input.apiModel,
      prompt: sanitizedPrompt,
      size: input.size,
      seconds: input.seconds,
    }),
  });
}

const openAiVideoPersistInFlight = new Map<string, Promise<string>>();

async function persistOpenAIVideo(videoId: string) {
  const response = await fetch(`${OPENAI_API_BASE}/videos/${videoId}/content`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  if (!response.ok) {
    throw new Error(`OpenAI video download failed (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (studioUploadUsesR2()) {
    return putR2Object(`generated/videos/${videoId}.mp4`, buffer, "video/mp4");
  }

  const fileName = `${videoId}-${randomUUID()}.mp4`;
  const relativeDir = path.join("assets", "openai", "video");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);

  return `${getAppUrl()}/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

function persistOpenAIVideoInFlight(videoId: string) {
  const existing = openAiVideoPersistInFlight.get(videoId);
  if (existing) {
    return existing;
  }

  const promise = persistOpenAIVideo(videoId).finally(() => {
    openAiVideoPersistInFlight.delete(videoId);
  });
  openAiVideoPersistInFlight.set(videoId, promise);
  return promise;
}

export async function startOpenAIVideoGeneration(input: {
  prompt: string;
  scriptText: string;
  format: GenerationFormat;
  model?: string;
  adhereToScript?: boolean;
  shotNotes?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  style?: {
    aspectRatio?: string;
    duration?: number;
    captionStyle?: string;
    musicEnabled?: boolean;
  };
}) {
  if (!isOpenAIVideoModel(input.model)) {
    throw new Error("Invalid OpenAI video model.");
  }

  const spec = resolveOpenAIVideoModel(input.model);
  const referenceImageUrl =
    input.referenceImageUrls?.[0] ?? input.referenceImageUrl ?? undefined;
  const aspectRatio = input.style?.aspectRatio ?? "9:16";
  const seconds = clampOpenAISeconds(input.style?.duration, spec);
  const size = videoSizeForAspectRatio(aspectRatio, spec.apiModel);

  const videoPrompt = input.adhereToScript
    ? buildStrictStudioVideoPrompt({
        format: input.format,
        scriptText: input.scriptText,
        visualDirection: input.prompt,
        shotNotes: input.shotNotes,
        captionStyle: input.style?.captionStyle,
        musicEnabled: input.style?.musicEnabled,
        hasReferenceImage: Boolean(referenceImageUrl),
        hasReferenceVideo: false,
        videoMode: referenceImageUrl ? "image-to-video" : "text-to-video",
      })
    : buildDashboardVideoPrompt({
        format: input.format,
        scriptText: input.scriptText,
        prompt: input.prompt,
        captionStyle: input.style?.captionStyle,
        musicEnabled: input.style?.musicEnabled,
      });

  const created = await createOpenAIVideoJob({
    apiModel: spec.apiModel,
    prompt: videoPrompt,
    size,
    seconds,
    referenceImageUrl:
      referenceImageUrl && spec.supportsImageInput ? referenceImageUrl : undefined,
  });

  if (!created.id) {
    throw new Error("OpenAI did not return a video job id.");
  }

  return {
    requestId: encodeOpenAIJob({
      provider: "openai",
      videoId: created.id,
      model: spec.id,
    }),
    videoUrl: undefined,
    duration: Number(seconds),
    aspectRatio,
    resolution: size,
    model: spec.id,
    mode: referenceImageUrl ? "image-to-video" : "text-to-video",
  };
}

export async function pollOpenAIVideoGeneration(requestId: string) {
  const ref = decodeOpenAIJob(requestId);
  const status = await openaiRequest<OpenAIVideoJob>(`/videos/${ref.videoId}`, {
    method: "GET",
  });

  const normalized = (status.status ?? "").toLowerCase();

  if (normalized === "completed") {
    const videoUrl = await persistOpenAIVideoInFlight(ref.videoId);
    return {
      status: "done" as const,
      videoUrl,
      durationSec: undefined,
      raw: status,
    };
  }

  if (normalized === "failed" || normalized === "error") {
    return {
      status: "failed" as const,
      videoUrl: undefined,
      durationSec: undefined,
      errorMessage: status.error?.message ?? "OpenAI video generation failed.",
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
