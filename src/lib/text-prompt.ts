/** Keep text LLM prompts well under Kimi K2.6's 262k token window. */
export const MAX_TEXT_PROMPT_CHARS = 32_000;

const DATA_URL_PATTERN =
  /data:(?:image|audio|video)\/[a-z0-9+.-]+;base64,[a-z0-9+/=\s]+/gi;

export function stripEmbeddedMediaUrls(text: string): string {
  return text.replace(DATA_URL_PATTERN, "[embedded media omitted]");
}

export function truncateTextPrompt(text: string, maxChars = MAX_TEXT_PROMPT_CHARS): string {
  const cleaned = stripEmbeddedMediaUrls(text).trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxChars)}\n\n[Context truncated for model limits.]`;
}

export function summarizeMediaUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:")) {
    return "[embedded media]";
  }
  if (trimmed.length <= 120) {
    return trimmed;
  }
  return `${trimmed.slice(0, 80)}…${trimmed.slice(-24)}`;
}
