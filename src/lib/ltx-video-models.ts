import {
  isOpenAIVideoModel,
  openaiVideoModels,
  resolveOpenAIVideoModel,
  type OpenAIVideoModelSpec,
} from "@/lib/openai-models";

export type LtxVideoMode =
  | "text-to-video"
  | "image-to-video"
  | "video-edit"
  | "video-extend";

export type LtxVideoResolution = "1080p" | "1440p" | "4k";

export type StudioVideoOperation = "auto" | "edit" | "extend" | "control";

export type LtxVideoModelSpec = {
  id: string;
  label: string;
  apiModel: string;
  mode: LtxVideoMode;
  endpoint: "text-to-video" | "image-to-video" | "retake" | "extend";
  description: string;
  priceHint: string;
  durations: number[];
  resolutions: LtxVideoResolution[];
  aspectRatios: string[];
  defaultDuration: number;
  defaultResolution: LtxVideoResolution;
  defaultAspectRatio: string;
  supportsAspectRatio: boolean;
  supportsDuration: boolean;
  requiresImage: boolean;
  requiresVideo: boolean;
};

export const LTX_DEFAULT_VIDEO_MODEL = "ltx-2-3-fast";

const FAST_DURATIONS = [6, 8, 10, 12, 14, 16, 18, 20];
const PRO_DURATIONS = [6, 8, 10];
const EXTEND_DURATIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const LTX_RES: LtxVideoResolution[] = ["1080p", "1440p", "4k"];
const LTX_ASPECT = ["16:9", "9:16"];

export const ltxVideoModels: LtxVideoModelSpec[] = [
  {
    id: "ltx-2-3-fast/text-to-video",
    label: "LTX-2.3 Fast · Text → Video",
    apiModel: "ltx-2-3-fast",
    mode: "text-to-video",
    endpoint: "text-to-video",
    description: "Fast text-to-video with synced audio (up to 20s, 1080p–4K).",
    priceHint: "Fast · up to 20s",
    durations: FAST_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: LTX_ASPECT,
    defaultDuration: 8,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: true,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: false,
  },
  {
    id: "ltx-2-3-pro/text-to-video",
    label: "LTX-2.3 Pro · Text → Video",
    apiModel: "ltx-2-3-pro",
    mode: "text-to-video",
    endpoint: "text-to-video",
    description: "Higher-fidelity text-to-video with synced audio.",
    priceHint: "Pro · up to 10s",
    durations: PRO_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: LTX_ASPECT,
    defaultDuration: 8,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: true,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: false,
  },
  {
    id: "ltx-2-3-fast/image-to-video",
    label: "LTX-2.3 Fast · Image → Video",
    apiModel: "ltx-2-3-fast",
    mode: "image-to-video",
    endpoint: "image-to-video",
    description: "Animate a connected image with motion and audio.",
    priceHint: "Fast · up to 20s",
    durations: FAST_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 8,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
  },
  {
    id: "ltx-2-3-pro/image-to-video",
    label: "LTX-2.3 Pro · Image → Video",
    apiModel: "ltx-2-3-pro",
    mode: "image-to-video",
    endpoint: "image-to-video",
    description: "Higher-fidelity image animation with synced audio.",
    priceHint: "Pro · up to 10s",
    durations: PRO_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 8,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
  },
  {
    id: "ltx-2-3-pro/retake",
    label: "LTX-2.3 Pro · Retake",
    apiModel: "ltx-2-3-pro",
    mode: "video-edit",
    endpoint: "retake",
    description: "Re-generate a section of a connected clip from a prompt.",
    priceHint: "Pro · section edit",
    durations: [2, 4, 6, 8, 10],
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: true,
  },
  {
    id: "ltx-2-pro/extend",
    label: "LTX-2 Pro · Extend",
    apiModel: "ltx-2-pro",
    mode: "video-extend",
    endpoint: "extend",
    description: "Continue a connected clip from its last frame.",
    priceHint: "Pro · +2–20s",
    durations: EXTEND_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: true,
  },
];

export type LtxVideoRouteInput = {
  modelOverride?: string | null;
  referenceImageUrl?: string | null;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string | null;
  videoOperation?: StudioVideoOperation;
};

export type LtxVideoRoute = {
  spec: LtxVideoModelSpec;
  modelId: string;
};

function pickAutoSpec(input: LtxVideoRouteInput): LtxVideoModelSpec {
  const images = input.referenceImageUrls?.filter(Boolean) ?? [];
  const primaryImage = input.referenceImageUrl ?? images[0];

  if (input.referenceVideoUrl) {
    const op = input.videoOperation ?? "auto";
    if (op === "extend") {
      return ltxVideoModels.find((m) => m.id === "ltx-2-pro/extend")!;
    }
    return ltxVideoModels.find((m) => m.id === "ltx-2-3-pro/retake")!;
  }

  if (primaryImage) {
    return ltxVideoModels.find((m) => m.id === "ltx-2-3-fast/image-to-video")!;
  }

  const envDefault = process.env.LTX_VIDEO_MODEL?.trim();
  if (envDefault) {
    return getLtxVideoModelSpec(envDefault);
  }

  return ltxVideoModels.find((m) => m.id === "ltx-2-3-fast/text-to-video")!;
}

function openaiVideoAsLtxSpec(spec: OpenAIVideoModelSpec): LtxVideoModelSpec {
  return {
    id: spec.id,
    label: spec.label,
    apiModel: spec.apiModel,
    mode: "text-to-video",
    endpoint: "text-to-video",
    description: spec.description,
    priceHint: spec.priceHint,
    durations: spec.durations,
    resolutions: ["1080p"],
    aspectRatios: ["16:9", "9:16"],
    defaultDuration: spec.defaultDuration,
    defaultResolution: "1080p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: true,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: false,
  };
}

export function getLtxVideoModelSpec(modelId: string) {
  const normalized = modelId.replace(/^\//, "").trim();

  if (isOpenAIVideoModel(normalized)) {
    return openaiVideoAsLtxSpec(resolveOpenAIVideoModel(normalized));
  }

  const direct = ltxVideoModels.find((item) => item.id === normalized);
  if (direct) return direct;

  const byApiModel = ltxVideoModels.find(
    (item) => item.apiModel === normalized && item.mode === "text-to-video",
  );
  if (byApiModel) return byApiModel;

  return ltxVideoModels.find((m) => m.id === "ltx-2-3-fast/text-to-video")!;
}

export function resolveLtxVideoRoute(input: LtxVideoRouteInput): LtxVideoRoute {
  const override = input.modelOverride?.trim();
  if (override) {
    const spec = getLtxVideoModelSpec(override);
    return { spec, modelId: spec.id };
  }

  const spec = pickAutoSpec(input);
  return { spec, modelId: spec.id };
}

export function normalizeStudioVideoResolution(
  resolution: string | undefined,
  spec: LtxVideoModelSpec,
): LtxVideoResolution {
  const raw = (resolution ?? "").toLowerCase();
  if (raw === "1k" || raw === "480p" || raw === "720p") return spec.defaultResolution;
  if (raw === "4k" || raw === "2160p") return "4k";
  if (spec.resolutions.includes(raw as LtxVideoResolution)) {
    return raw as LtxVideoResolution;
  }
  return spec.defaultResolution;
}

export function normalizeStudioVideoAspectRatio(
  aspectRatio: string | undefined,
  spec: LtxVideoModelSpec,
) {
  if (!spec.supportsAspectRatio) return undefined;
  const raw = aspectRatio ?? spec.defaultAspectRatio;
  if (spec.aspectRatios.includes(raw)) return raw;
  if (raw === "1:1") return "9:16";
  if (raw === "16:9" || raw === "9:16") return raw;
  return spec.defaultAspectRatio;
}

export function toLtxApiResolution(resolution: LtxVideoResolution, aspectRatio?: string) {
  const portrait = aspectRatio === "9:16" || aspectRatio === "3:4";
  switch (resolution) {
    case "4k":
      return portrait ? "2160x3840" : "3840x2160";
    case "1440p":
      return portrait ? "1440x2560" : "2560x1440";
    case "1080p":
    default:
      return portrait ? "1080x1920" : "1920x1080";
  }
}

export function clampVideoDuration(duration: number | undefined, spec: LtxVideoModelSpec) {
  if (!spec.supportsDuration || spec.durations.length === 0) {
    return spec.defaultDuration;
  }

  const requested = Math.round(Number(duration ?? spec.defaultDuration));
  const min = Math.min(...spec.durations);
  const max = Math.max(...spec.durations);
  const clamped = Math.min(max, Math.max(min, requested));

  let nearest = spec.durations[0];
  let bestDelta = Math.abs(nearest - clamped);
  for (const option of spec.durations) {
    const delta = Math.abs(option - clamped);
    if (delta < bestDelta) {
      nearest = option;
      bestDelta = delta;
    }
  }
  return nearest;
}

export function listDurationOptions(spec: LtxVideoModelSpec) {
  if (!spec.supportsDuration || spec.durations.length === 0) return [];
  return spec.durations.map((seconds) => ({
    value: seconds,
    label: spec.mode === "video-extend" ? `+${seconds}s` : `${seconds}s`,
  }));
}

export function listResolutionOptions(spec: LtxVideoModelSpec) {
  return spec.resolutions.map((value) => ({ value, label: value }));
}

export function studioVideoModelOptions(hasImage: boolean, hasVideo: boolean) {
  const openaiOptions = hasVideo ? [] : openaiVideoModels.map(openaiVideoAsLtxSpec);

  if (hasVideo) {
    return ltxVideoModels.filter(
      (item) => item.mode === "video-edit" || item.mode === "video-extend",
    );
  }

  if (hasImage) {
    return [
      ...ltxVideoModels.filter(
        (item) => item.mode === "image-to-video" || item.mode === "text-to-video",
      ),
      ...openaiOptions,
    ];
  }

  return [
    ...ltxVideoModels.filter((item) => item.mode === "text-to-video"),
    ...openaiOptions,
  ];
}
