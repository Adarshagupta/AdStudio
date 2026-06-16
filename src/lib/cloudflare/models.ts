export const cloudflareModels = {
  text: {
    default: "accounts/fireworks/models/kimi-k2p6",
    options: [
      "accounts/fireworks/models/kimi-k2p6",
      "accounts/fireworks/models/kimi-k2-instruct",
      "accounts/fireworks/models/kimi-k2-thinking",
      "accounts/fireworks/models/kimi-k2p5",
    ],
  },
  image: {
    default: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    options: [
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      "openai/dall-e-3",
      "openai/gpt-image-1",
      "sylicaai/flux-schnell",
      "self-hosted/flux-2-dev",
    ],
  },
  audio: {
    default: "@cf/myshell-ai/melotts",
    options: ["@cf/myshell-ai/melotts"],
  },
  video: {
    default: "",
    options: [] as string[],
    requiresCredits: true,
  },
} as const;

export type CloudflareModelCategory = keyof typeof cloudflareModels;

export function resolveCloudflareModel(category: CloudflareModelCategory, override?: string | null) {
  const envKey = {
    text: process.env.CF_TEXT_MODEL,
    image: process.env.CF_IMAGE_MODEL,
    audio: process.env.CF_AUDIO_MODEL,
    video: process.env.CF_VIDEO_MODEL,
  }[category];

  const fallback = envKey || cloudflareModels[category].default;
  const candidate = override?.trim();

  if (!candidate) {
    return fallback;
  }

  const options = cloudflareModels[category].options as readonly string[];
  if (options.includes(candidate)) {
    return candidate;
  }

  if (options.includes(candidate)) {
    return candidate;
  }

  if (candidate.startsWith("self-hosted/")) {
    return candidate;
  }

  if (candidate.startsWith("@cf/") || candidate.startsWith("openai/") || candidate.startsWith("sylicaai/")) {
    return candidate;
  }

  return fallback;
}
