import { cloudflareModels } from "@/lib/cloudflare/models";
import { formatStudioNodeText } from "@/lib/studio-pro/display-text";
import { truncateTextPrompt } from "@/lib/text-prompt";

const FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1";

export const FIREWORKS_DEFAULT_TEXT_MODEL = "accounts/fireworks/models/kimi-k2p6";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type FireworksChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function getApiKey() {
  const key = process.env.FIREWORKS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FIREWORKS_API_KEY is required for text generation. Get a key at https://fireworks.ai",
    );
  }
  return key;
}

export function resolveFireworksTextModel(override?: string | null) {
  const configured = process.env.FIREWORKS_TEXT_MODEL?.trim();
  const fallback = configured || FIREWORKS_DEFAULT_TEXT_MODEL;
  const candidate = override?.trim();

  if (!candidate || candidate.startsWith("@cf/")) {
    return fallback;
  }

  const options = cloudflareModels.text.options as readonly string[];
  if (options.includes(candidate)) {
    return candidate;
  }

  return fallback;
}

export async function fireworksChat(input: {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  model?: string;
}) {
  const model = resolveFireworksTextModel(input.model);
  const messages = input.messages.map((message) => ({
    ...message,
    content: truncateTextPrompt(message.content),
  }));

  const response = await fetch(`${FIREWORKS_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: input.max_tokens ?? 1024,
      temperature: input.temperature ?? 0.7,
      thinking: { type: "disabled" },
    }),
  });

  const data = (await response.json()) as FireworksChatResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Fireworks request failed (${response.status}).`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Fireworks returned empty text.");
  }

  return formatStudioNodeText(content) || content;
}
