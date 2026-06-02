export const cloudflareModels = {
  text: {
    default: "@cf/meta/llama-3.1-8b-instruct",
    options: [
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.3-70b-instruct",
      "@cf/google/gemma-3-12b-it",
    ],
  },
  image: {
    default: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    options: ["@cf/stabilityai/stable-diffusion-xl-base-1.0"],
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

  if (candidate.startsWith("@cf/")) {
    return candidate;
  }

  return fallback;
}
