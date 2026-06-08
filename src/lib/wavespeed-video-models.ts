export type WaveSpeedVideoMode =
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video"
  | "video-edit"
  | "video-extend"
  | "video-control";

export type WaveSpeedVideoProvider = "grok" | "ltx";

export type WaveSpeedVideoResolution = "480p" | "720p" | "1080p";

export type StudioVideoOperation = "auto" | "edit" | "extend" | "control";

export type WaveSpeedVideoModelSpec = {
  id: string;
  label: string;
  provider: WaveSpeedVideoProvider;
  mode: WaveSpeedVideoMode;
  description: string;
  priceHint: string;
  durations: number[];
  resolutions: WaveSpeedVideoResolution[];
  aspectRatios: string[];
  defaultDuration: number;
  defaultResolution: WaveSpeedVideoResolution;
  defaultAspectRatio: string;
  supportsAspectRatio: boolean;
  supportsDuration: boolean;
  requiresImage: boolean;
  requiresVideo: boolean;
  supportsMultipleImages: boolean;
};

export const WAVESPEED_DEFAULT_VIDEO_MODEL = "x-ai/grok-imagine-video/text-to-video";

export const GROK_T2V = "x-ai/grok-imagine-video/text-to-video";
export const GROK_I2V = "x-ai/grok-imagine-video/image-to-video";
export const GROK_I2V_V15 = "x-ai/grok-imagine-video-v1.5/image-to-video";
export const GROK_REF2V = "x-ai/grok-imagine-video/reference-to-video";
export const GROK_EDIT = "x-ai/grok-imagine-video/edit-video";
export const GROK_EXTEND = "x-ai/grok-imagine-video/video-extend";

export const WAVESPEED_LTX_TEXT_TO_VIDEO = "wavespeed-ai/ltx-2-19b/text-to-video";
export const WAVESPEED_LTX_IMAGE_TO_VIDEO = "wavespeed-ai/ltx-2-19b/image-to-video";
export const WAVESPEED_LTX_VIDEO_CONTROL = "wavespeed-ai/ltx-2-19b/control";

const GROK_T2V_DURATIONS = [5, 6, 8, 10, 12, 15];
const GROK_SHORT_DURATIONS = [6, 10];
const GROK_V15_DURATIONS = [5, 6, 8, 10, 12, 15];
const LTX_DURATIONS = [5, 10, 15, 20];
const GROK_RES: WaveSpeedVideoResolution[] = ["480p", "720p"];
const GROK_V15_RES: WaveSpeedVideoResolution[] = ["480p", "720p"];
const LTX_RES: WaveSpeedVideoResolution[] = ["480p", "720p", "1080p"];
const GROK_ASPECT = ["16:9", "9:16", "1:1", "4:3", "3:4"];

export const wavespeedVideoModels: WaveSpeedVideoModelSpec[] = [
  {
    id: GROK_T2V,
    label: "Grok Text → Video",
    provider: "grok",
    mode: "text-to-video",
    description: "Script-led clips from text (1–15s, 480p/720p). ~$0.05/s.",
    priceHint: "~$0.05/s",
    durations: GROK_T2V_DURATIONS,
    resolutions: GROK_RES,
    aspectRatios: GROK_ASPECT,
    defaultDuration: 6,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: true,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: false,
    supportsMultipleImages: false,
  },
  {
    id: GROK_I2V,
    label: "Grok Image → Video",
    provider: "grok",
    mode: "image-to-video",
    description: "Animate a connected image with motion + audio (6s or 10s).",
    priceHint: "~$0.05/s",
    durations: GROK_SHORT_DURATIONS,
    resolutions: GROK_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
    supportsMultipleImages: false,
  },
  {
    id: GROK_I2V_V15,
    label: "Grok v1.5 Image → Video",
    provider: "grok",
    mode: "image-to-video",
    description: "Faster image animation with 1–15s and cinematic control.",
    priceHint: "from $0.12/s",
    durations: GROK_V15_DURATIONS,
    resolutions: GROK_V15_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
    supportsMultipleImages: false,
  },
  {
    id: GROK_REF2V,
    label: "Grok Reference → Video",
    provider: "grok",
    mode: "reference-to-video",
    description: "Multiple reference images with identity preserved (6s or 10s).",
    priceHint: "~$0.05/s",
    durations: GROK_SHORT_DURATIONS,
    resolutions: GROK_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
    supportsMultipleImages: true,
  },
  {
    id: GROK_EDIT,
    label: "Grok Edit Video",
    provider: "grok",
    mode: "video-edit",
    description: "Transform a connected clip with a text edit prompt.",
    priceHint: "~$0.065/s",
    durations: [],
    resolutions: GROK_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "480p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: false,
    requiresImage: false,
    requiresVideo: true,
    supportsMultipleImages: false,
  },
  {
    id: GROK_EXTEND,
    label: "Grok Extend Video",
    provider: "grok",
    mode: "video-extend",
    description: "Continue a connected clip from its last frame (+6s or +10s).",
    priceHint: "~$0.05/s",
    durations: GROK_SHORT_DURATIONS,
    resolutions: GROK_RES,
    aspectRatios: [],
    defaultDuration: 6,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: true,
    supportsMultipleImages: false,
  },
  {
    id: WAVESPEED_LTX_TEXT_TO_VIDEO,
    label: "LTX-2 Text → Video",
    provider: "ltx",
    mode: "text-to-video",
    description: "Longer clips up to 20s with synced audio (480p–1080p).",
    priceHint: "from $0.06/5s",
    durations: LTX_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: ["16:9", "9:16"],
    defaultDuration: 5,
    defaultResolution: "480p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: true,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: false,
    supportsMultipleImages: false,
  },
  {
    id: WAVESPEED_LTX_IMAGE_TO_VIDEO,
    label: "LTX-2 Image → Video",
    provider: "ltx",
    mode: "image-to-video",
    description: "Animate image with LTX audio-video (5–20s).",
    priceHint: "from $0.06/5s",
    durations: LTX_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 5,
    defaultResolution: "480p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: true,
    requiresVideo: false,
    supportsMultipleImages: false,
  },
  {
    id: WAVESPEED_LTX_VIDEO_CONTROL,
    label: "LTX-2 Video Control",
    provider: "ltx",
    mode: "video-control",
    description: "Pose/depth motion transfer from a connected video.",
    priceHint: "from $0.15/5s",
    durations: LTX_DURATIONS,
    resolutions: LTX_RES,
    aspectRatios: [],
    defaultDuration: 5,
    defaultResolution: "720p",
    defaultAspectRatio: "9:16",
    supportsAspectRatio: false,
    supportsDuration: true,
    requiresImage: false,
    requiresVideo: true,
    supportsMultipleImages: false,
  },
];

export type WaveSpeedVideoRouteInput = {
  modelOverride?: string | null;
  referenceImageUrl?: string | null;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string | null;
  videoOperation?: StudioVideoOperation;
};

export type WaveSpeedVideoRoute = {
  spec: WaveSpeedVideoModelSpec;
  modelId: string;
};

function pickAutoSpec(input: WaveSpeedVideoRouteInput): WaveSpeedVideoModelSpec {
  const images = input.referenceImageUrls?.filter(Boolean) ?? [];
  const primaryImage = input.referenceImageUrl ?? images[0];

  if (input.referenceVideoUrl) {
    const op = input.videoOperation ?? "auto";
    if (op === "extend") {
      return wavespeedVideoModels.find((m) => m.id === GROK_EXTEND)!;
    }
    if (op === "control") {
      return wavespeedVideoModels.find((m) => m.id === WAVESPEED_LTX_VIDEO_CONTROL)!;
    }
    return wavespeedVideoModels.find((m) => m.id === GROK_EDIT)!;
  }

  if (images.length >= 2) {
    return wavespeedVideoModels.find((m) => m.id === GROK_REF2V)!;
  }

  if (primaryImage) {
    return wavespeedVideoModels.find((m) => m.id === GROK_I2V)!;
  }

  const envDefault = process.env.WAVESPEED_VIDEO_MODEL?.trim();
  if (envDefault) {
    return getWaveSpeedVideoModelSpec(envDefault);
  }

  return wavespeedVideoModels.find((m) => m.id === GROK_T2V)!;
}

export function getWaveSpeedVideoModelSpec(modelId: string) {
  const normalized = modelId.replace(/^\//, "").trim();
  return (
    wavespeedVideoModels.find((item) => item.id === normalized) ??
    wavespeedVideoModels.find((item) => item.id === GROK_T2V)!
  );
}

export function resolveWaveSpeedVideoRoute(input: WaveSpeedVideoRouteInput): WaveSpeedVideoRoute {
  const override = input.modelOverride?.trim();
  if (override && override.includes("/")) {
    const spec = getWaveSpeedVideoModelSpec(override);
    return { spec, modelId: spec.id };
  }

  const spec = pickAutoSpec(input);
  return { spec, modelId: spec.id };
}

export function normalizeStudioVideoResolution(
  resolution: string | undefined,
  spec: WaveSpeedVideoModelSpec,
): WaveSpeedVideoResolution {
  const raw = (resolution ?? "").toLowerCase();
  if (raw === "1k") return spec.defaultResolution;
  if (spec.resolutions.includes(raw as WaveSpeedVideoResolution)) {
    return raw as WaveSpeedVideoResolution;
  }
  return spec.defaultResolution;
}

export function normalizeStudioVideoAspectRatio(
  aspectRatio: string | undefined,
  spec: WaveSpeedVideoModelSpec,
) {
  if (!spec.supportsAspectRatio) return undefined;
  const raw = aspectRatio ?? spec.defaultAspectRatio;
  if (spec.aspectRatios.includes(raw)) return raw;
  if (raw === "1:1" && spec.aspectRatios.includes("1:1")) return "1:1";
  if (raw === "16:9" || raw === "9:16") return raw;
  return spec.defaultAspectRatio;
}

export function clampVideoDuration(duration: number | undefined, spec: WaveSpeedVideoModelSpec) {
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

export function listDurationOptions(spec: WaveSpeedVideoModelSpec) {
  if (!spec.supportsDuration || spec.durations.length === 0) return [];
  return spec.durations.map((seconds) => ({
    value: seconds,
    label: spec.mode === "video-extend" ? `+${seconds}s` : `${seconds}s`,
  }));
}

export function listResolutionOptions(spec: WaveSpeedVideoModelSpec) {
  return spec.resolutions.map((value) => ({ value, label: value }));
}

export function studioVideoModelOptions(
  hasImage: boolean,
  hasVideo: boolean,
  imageCount = hasImage ? 1 : 0,
) {
  if (hasVideo) {
    return wavespeedVideoModels.filter(
      (item) =>
        item.mode === "video-edit" || item.mode === "video-extend" || item.mode === "video-control",
    );
  }

  if (imageCount >= 2) {
    return wavespeedVideoModels.filter(
      (item) =>
        item.mode === "reference-to-video" ||
        item.mode === "image-to-video" ||
        item.mode === "text-to-video",
    );
  }

  if (hasImage) {
    return wavespeedVideoModels.filter(
      (item) => item.mode === "image-to-video" || item.mode === "text-to-video",
    );
  }

  return wavespeedVideoModels.filter((item) => item.mode === "text-to-video");
}
