import type { GenerationFormat } from "@prisma/client";

import { resolveCloudflareModel } from "@/lib/cloudflare/models";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

type ProviderJobRef =
  | { kind: "sync"; videoUrl: string }
  | { kind: "async"; model: string; requestId: string };

type CloudflareRunPayload = Record<string, unknown> & {
  state?: string;
  status?: string;
  result?: Record<string, unknown>;
  request_id?: string;
  response?: string;
  audio?: string;
  image?: string;
  video?: string;
  success?: boolean;
  errors?: Array<{ message?: string }>;
  imageDataUrl?: string;
  audioDataUrl?: string;
};

function getCredentials() {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
  }

  return { accountId: CF_ACCOUNT_ID, apiToken: CF_API_TOKEN };
}

function apiBase(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
}

export function encodeProviderJob(ref: ProviderJobRef) {
  return JSON.stringify(ref);
}

export function decodeProviderJob(requestId: string): ProviderJobRef {
  try {
    const parsed = JSON.parse(requestId) as ProviderJobRef;
    if (parsed.kind === "sync" || parsed.kind === "async") {
      return parsed;
    }
  } catch {
    if (requestId.startsWith("sync:")) {
      return { kind: "sync", videoUrl: requestId.slice(5) };
    }
  }

  throw new Error("Invalid Cloudflare provider job reference.");
}

async function parseCloudflareResponse(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("image/")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = contentType.split(";")[0] || "image/png";
    return {
      imageDataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    } satisfies CloudflareRunPayload;
  }

  if (contentType.includes("audio/")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = contentType.split(";")[0] || "audio/mpeg";
    return {
      audioDataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    } satisfies CloudflareRunPayload;
  }

  let data: CloudflareRunPayload;
  try {
    data = (await response.json()) as CloudflareRunPayload;
  } catch {
    if (!response.ok) {
      throw new Error(`${fallback} (${response.status})`);
    }
    throw new Error(`${fallback}: unexpected response format.`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(getCloudflareError(data, fallback, response.status));
  }

  return data;
}

export async function runCloudflareModel(model: string, input: Record<string, unknown>) {
  const { accountId, apiToken } = getCredentials();
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(
    model.startsWith("@cf/")
      ? `${apiBase(accountId)}/ai/run/${model}`
      : `${apiBase(accountId)}/ai/run`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(model.startsWith("@cf/") ? input : { model, input }),
    },
  );

  return parseCloudflareResponse(response, `Cloudflare model run failed for ${model}`);
}

function getCloudflareError(data: CloudflareRunPayload, fallback: string, status: number) {
  const message =
    data.errors?.[0]?.message ??
    (typeof data.result === "object" && data.result && "error" in data.result
      ? String((data.result as { error?: string }).error)
      : undefined);

  return message ? `${fallback}: ${message}` : `${fallback} (${status})`;
}

function formatInstruction(format: GenerationFormat) {
  if (format === "BRAIN_ROT") {
    return "Create a short, high-retention brain-rot style ad with a fast hook, kinetic captions, and product proof.";
  }

  if (format === "STATIC") {
    return "Create a concise static ad concept with headline, supporting copy, and visual direction.";
  }

  if (format === "REVIEW") {
    return "Create a review-style ad script with a believable pain point, proof, objection handling, and CTA.";
  }

  return "Create a UGC talking-head ad script with hook, problem, product demo, proof, and CTA.";
}

function extractText(data: CloudflareRunPayload) {
  const nested = data.result;
  const content =
    (typeof nested?.response === "string" ? nested.response : undefined) ??
    (typeof data.response === "string" ? data.response : undefined) ??
    (typeof nested?.text === "string" ? nested.text : undefined);

  return content?.trim();
}

function extractImageUrl(data: CloudflareRunPayload) {
  if (typeof data.imageDataUrl === "string") {
    return data.imageDataUrl;
  }

  const nested = data.result;
  const image =
    (typeof nested?.image === "string" ? nested.image : undefined) ??
    (typeof data.image === "string" ? data.image : undefined);

  if (typeof image === "string" && image.startsWith("data:image")) {
    return image;
  }

  if (typeof image === "string" && (image.startsWith("http") || image.startsWith("https"))) {
    return image;
  }

  return undefined;
}

function extractAudioUrl(data: CloudflareRunPayload) {
  if (typeof data.audioDataUrl === "string") {
    return data.audioDataUrl;
  }

  const nested = data.result;
  const audio =
    (typeof nested?.audio === "string" ? nested.audio : undefined) ??
    (typeof data.audio === "string" ? data.audio : undefined);

  if (!audio) {
    return undefined;
  }

  if (audio.startsWith("data:audio")) {
    return audio;
  }

  return `data:audio/mpeg;base64,${audio}`;
}

function extractVideoUrl(data: CloudflareRunPayload) {
  const nested = data.result;
  return (
    (typeof nested?.video === "string" ? nested.video : undefined) ??
    (typeof data.video === "string" ? data.video : undefined)
  );
}

function normalizeAspectRatio(aspectRatio?: string): string {
  if (aspectRatio && ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"].includes(aspectRatio)) {
    return aspectRatio;
  }

  return "9:16";
}

function normalizeVideoResolution(resolution?: string) {
  if (resolution === "1080p") {
    return "1080p";
  }

  if (resolution === "540p" || resolution === "480p") {
    return "540p";
  }

  return "720p";
}

function buildImageModelInput(model: string, prompt: string, aspectRatio: string) {
  if (model === "google/imagen-4" || model.startsWith("google/imagen")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      person_generation: "allow_adult",
    };
  }

  if (model.includes("grok-imagine-image")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      quality: "medium",
    };
  }

  if (model.startsWith("@cf/stabilityai/") || model.includes("stable-diffusion")) {
    return {
      prompt,
      num_steps: 20,
      guidance: 7.5,
    };
  }

  return {
    prompt,
    aspect_ratio: aspectRatio,
  };
}

function buildVideoModelInput(
  model: string,
  prompt: string,
  options: {
    aspectRatio: string;
    duration: number;
    resolution: string;
    musicEnabled: boolean;
  },
) {
  const { aspectRatio, duration, resolution, musicEnabled } = options;

  if (model.startsWith("google/veo")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      duration: `${duration}s`,
      resolution,
      generate_audio: musicEnabled,
    };
  }

  if (model.startsWith("pixverse/")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      quality: resolution,
      generate_audio: musicEnabled,
    };
  }

  if (model.startsWith("vidu/")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      resolution,
      audio: musicEnabled,
    };
  }

  return {
    prompt,
    aspect_ratio: aspectRatio,
    duration,
    resolution,
    audio: musicEnabled,
  };
}

export async function generateScript(input: {
  prompt: string;
  format: GenerationFormat;
  productUrl?: string;
  model?: string;
}) {
  const model = resolveCloudflareModel("text", input.model);
  const data = await runCloudflareModel(model, {
    messages: [
      {
        role: "system",
        content:
          "You are a senior performance creative strategist. Write practical ad scripts that can be filmed or generated. Keep the output directly usable and avoid placeholders.",
      },
      {
        role: "user",
        content: [
          formatInstruction(input.format),
          `Product brief: ${input.prompt}`,
          input.productUrl ? `Product URL: ${input.productUrl}` : "",
          "Return a short-form ad script (about 15 seconds). Include visual direction, spoken lines, caption text, and CTA.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const content = extractText(data);
  if (!content) {
    throw new Error("Cloudflare returned an empty script.");
  }

  return content;
}

export async function generateCharacterProfile(input: {
  characterName?: string;
  prompt?: string;
  context?: string;
  model?: string;
}) {
  const model = resolveCloudflareModel("text", input.model);
  const name = input.characterName?.trim();
  const brief = input.prompt?.trim();

  if (!name && !brief && !input.context?.trim()) {
    throw new Error("Add a character name, brief, or connect an upstream Text node.");
  }

  const data = await runCloudflareModel(model, {
    messages: [
      {
        role: "system",
        content:
          "You are a casting director for UGC ads. Write a concise creator profile that can be used on camera. Include persona, tone, speaking style, wardrobe, and energy. Avoid placeholders.",
      },
      {
        role: "user",
        content: [
          name ? `Character name: ${name}` : "",
          brief ? `Creative brief: ${brief}` : "",
          input.context ? `Flow context:\n${input.context}` : "",
          "Return a practical UGC creator profile in 4-6 sentences.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });

  const content = extractText(data);
  if (!content) {
    throw new Error("Cloudflare returned an empty character profile.");
  }

  return content;
}

export async function generateImage(input: {
  prompt: string;
  model?: string;
  aspectRatio?: string;
}) {
  const model = resolveCloudflareModel("image", input.model);
  const aspectRatio = normalizeAspectRatio(input.aspectRatio);

  const data = await runCloudflareModel(
    model,
    buildImageModelInput(model, input.prompt, aspectRatio),
  );

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) {
    throw new Error("Cloudflare did not return an image.");
  }

  return { imageUrl };
}

export async function generateAudio(input: {
  prompt: string;
  model?: string;
  lang?: string;
}) {
  const model = resolveCloudflareModel("audio", input.model);
  const text = input.prompt.trim();

  if (text.length < 3) {
    throw new Error("Audio prompt needs at least 3 characters.");
  }

  const data = await runCloudflareModel(model, {
    prompt: text,
    text,
    lang: input.lang ?? "en",
  });

  const audioUrl = extractAudioUrl(data);
  if (!audioUrl) {
    throw new Error("Cloudflare did not return audio.");
  }

  return { audioUrl };
}

export async function startVideoGeneration(input: {
  prompt: string;
  scriptText: string;
  format: GenerationFormat;
  model?: string;
  style?: {
    aspectRatio?: string;
    duration?: number;
    resolution?: string;
    captionStyle?: string;
    musicEnabled?: boolean;
  };
}) {
  const model = resolveCloudflareModel("video", input.model);

  if (!model) {
    throw new Error(
      "Video generation is not available on the free Workers AI plan. Use Text, Image, and Audio nodes, or add AI Gateway credits and set CF_VIDEO_MODEL (for example vidu/q3-turbo).",
    );
  }

  if (!model.startsWith("@cf/") && !process.env.CF_VIDEO_MODEL) {
    throw new Error(
      "Video models require AI Gateway credits. Set CF_VIDEO_MODEL in .env after topping up credits at AI Gateway → Credits Available → Manage.",
    );
  }
  const duration = Math.min(16, Math.max(1, Number(input.style?.duration ?? 8)));
  const aspectRatio = normalizeAspectRatio(input.style?.aspectRatio);
  const resolution = normalizeVideoResolution(input.style?.resolution);
  const videoPrompt = [
    formatInstruction(input.format),
    `Ad script:\n${input.scriptText}`,
    `Creative brief: ${input.prompt}`,
    `Caption style: ${input.style?.captionStyle ?? "Clean"}`,
    `Music: ${input.style?.musicEnabled === false ? "No music" : "Include tasteful upbeat music"}`,
    "Generate a polished short-form marketing video. Avoid unreadable tiny text. Keep product shots and captions clear.",
  ].join("\n\n");

  const musicEnabled = input.style?.musicEnabled !== false;
  const data = await runCloudflareModel(
    model,
    buildVideoModelInput(model, videoPrompt, {
      aspectRatio,
      duration,
      resolution,
      musicEnabled,
    }),
  );

  const videoUrl = extractVideoUrl(data);
  if (videoUrl) {
    return {
      requestId: encodeProviderJob({ kind: "sync", videoUrl }),
      videoUrl,
      duration,
      aspectRatio,
      resolution,
    };
  }

  const requestId = data.request_id ?? (data.result?.request_id as string | undefined);
  if (requestId) {
    return {
      requestId: encodeProviderJob({ kind: "async", model, requestId }),
      duration,
      aspectRatio,
      resolution,
    };
  }

  if (data.state && !["Completed", "completed", "done"].includes(data.state)) {
    throw new Error(`Cloudflare video generation is ${data.state.toLowerCase()} without a job id.`);
  }

  throw new Error("Cloudflare did not return a video URL or job id.");
}

export async function pollVideoGeneration(requestId: string) {
  const ref = decodeProviderJob(requestId);

  if (ref.kind === "sync") {
    return {
      status: "done" as const,
      videoUrl: ref.videoUrl,
      durationSec: undefined,
      raw: ref,
    };
  }

  const data = await runCloudflareModel(ref.model, { request_id: ref.requestId });
  const videoUrl = extractVideoUrl(data);
  const state = (data.state ?? data.status ?? "").toLowerCase();

  if (videoUrl || state === "completed" || state === "done") {
    return {
      status: "done" as const,
      videoUrl,
      durationSec: undefined,
      raw: data,
    };
  }

  if (state === "failed" || state === "expired" || state === "error") {
    return {
      status: state === "expired" ? ("expired" as const) : ("failed" as const),
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

export function getConfiguredCloudflareModels() {
  return {
    text: resolveCloudflareModel("text"),
    image: resolveCloudflareModel("image"),
    audio: resolveCloudflareModel("audio"),
    video: resolveCloudflareModel("video"),
  };
}
