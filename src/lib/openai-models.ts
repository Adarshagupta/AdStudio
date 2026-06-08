export type OpenAIImageModelSpec = {
  id: string;
  label: string;
  apiModel: string;
  priceHint: string;
};

export type OpenAIVideoModelSpec = {
  id: string;
  label: string;
  apiModel: string;
  description: string;
  priceHint: string;
  durations: number[];
  defaultDuration: number;
  supportsImageInput: boolean;
};

export const OPENAI_IMAGE_PREFIX = "openai/";

export const openaiImageModels: OpenAIImageModelSpec[] = [
  {
    id: "openai/dall-e-3",
    label: "DALL·E 3",
    apiModel: "dall-e-3",
    priceHint: "Premium",
  },
  {
    id: "openai/gpt-image-1",
    label: "GPT Image 1",
    apiModel: "gpt-image-1",
    priceHint: "Premium · OpenAI billing required",
  },
];

export const openaiVideoModels: OpenAIVideoModelSpec[] = [
  {
    id: "openai/sora-2",
    label: "Sora 2",
    apiModel: "sora-2",
    description: "OpenAI text/image-to-video (720p).",
    priceHint: "Premium · up to 12s",
    durations: [4, 8, 12],
    defaultDuration: 8,
    supportsImageInput: true,
  },
  {
    id: "openai/sora-2-pro",
    label: "Sora 2 Pro",
    apiModel: "sora-2-pro",
    description: "Higher-fidelity OpenAI video with 1080p sizes.",
    priceHint: "Premium · up to 12s",
    durations: [4, 8, 12],
    defaultDuration: 8,
    supportsImageInput: true,
  },
];

export function isOpenAIImageModel(model?: string | null) {
  const candidate = model?.trim();
  if (!candidate?.startsWith(OPENAI_IMAGE_PREFIX)) return false;
  return openaiImageModels.some((item) => item.id === candidate);
}

export function isOpenAIVideoModel(model?: string | null) {
  const candidate = model?.trim();
  if (!candidate?.startsWith(OPENAI_IMAGE_PREFIX)) return false;
  return openaiVideoModels.some((item) => item.id === candidate);
}

export function resolveOpenAIImageModel(model?: string | null) {
  const candidate = model?.trim();
  const match = openaiImageModels.find(
    (item) => item.id === candidate || item.apiModel === candidate,
  );
  return match?.apiModel ?? openaiImageModels[0].apiModel;
}

export function resolveOpenAIVideoModel(model?: string | null) {
  const candidate = model?.trim();
  const match = openaiVideoModels.find((item) => item.id === candidate);
  return match ?? openaiVideoModels[0];
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function imageModelLabel(modelId: string) {
  return openaiImageModels.find((item) => item.id === modelId)?.label ?? modelId;
}

export function videoModelLabel(modelId: string) {
  return openaiVideoModels.find((item) => item.id === modelId)?.label ?? modelId;
}
