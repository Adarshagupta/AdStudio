import type { GenerationFormat } from "@prisma/client";

import { isOpenAIVideoModel } from "@/lib/openai-models";
import { pollOpenAIVideoGeneration, startOpenAIVideoGeneration } from "@/lib/openai-ai";
import * as ltx from "@/lib/ltx-ai";

type StartVideoInput = {
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
};

export async function startVideoGeneration(input: StartVideoInput) {
  if (isOpenAIVideoModel(input.model)) {
    try {
      return await startOpenAIVideoGeneration(input);
    } catch (error) {
      console.warn(
        "[video] OpenAI failed, falling back to LTX:",
        error instanceof Error ? error.message : error,
      );
      return ltx.startVideoGeneration({ ...input, model: undefined });
    }
  }

  return ltx.startVideoGeneration(input);
}

export async function pollVideoGeneration(requestId: string) {
  try {
    const parsed = JSON.parse(requestId) as { provider?: string };
    if (parsed.provider === "openai") {
      return pollOpenAIVideoGeneration(requestId);
    }
  } catch {
    // Legacy WaveSpeed ids are plain strings, not JSON.
  }

  return ltx.pollVideoGeneration(requestId);
}

export const restartVideoGenerationWithNextKey = ltx.restartVideoGenerationWithNextKey;
export const getConfiguredLtxApiKeyCount = ltx.getConfiguredLtxApiKeyCount;
export const getConfiguredLtxVideoModel = ltx.getConfiguredLtxVideoModel;

export {
  LTX_DEFAULT_VIDEO_MODEL,
  clampVideoDuration,
  listDurationOptions,
  listResolutionOptions,
  ltxVideoModels,
  normalizeStudioVideoAspectRatio,
  normalizeStudioVideoResolution,
  resolveLtxVideoRoute,
  studioVideoModelOptions,
  type StudioVideoOperation,
} from "@/lib/ltx-video-models";
