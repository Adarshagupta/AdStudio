import { compressStudioScriptText } from "@/lib/studio-pro/context-compression";

/** Turn model output into readable preview copy (unwrap JSON / code fences). */
export function formatStudioNodeText(value: string | undefined | null): string {
  if (!value?.trim()) return "";
  return extractReadableText(value.trim()) ?? value.trim().replace(/\r\n/g, "\n");
}

function extractReadableText(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("```")) {
      const unwrapped = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return extractReadableText(unwrapped, depth + 1) ?? unwrapped.replace(/\r\n/g, "\n");
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        const fromJson = extractReadableText(parsed, depth + 1);
        if (fromJson) return fromJson;
      } catch {
        // Keep original text when not valid JSON.
      }
    }

    return trimmed.replace(/\r\n/g, "\n");
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractReadableText(item, depth + 1);
      if (text) return text;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  if (record.result !== undefined) {
    const fromResult = extractReadableText(record.result, depth + 1);
    if (fromResult) return fromResult;
  }

  for (const key of [
    "response",
    "text",
    "output",
    "content",
    "message",
    "description",
    "script",
    "scriptText",
  ]) {
    if (record[key] !== undefined) {
      const text = extractReadableText(record[key], depth + 1);
      if (text) return text;
    }
  }

  return null;
}

export function previewLineCount(text: string, maxLines = 6) {
  const lines = text.split("\n").length;
  return Math.min(maxLines, Math.max(2, lines));
}

/** Strip tables / production bloat from Studio Pro text-node output. */
export function compactStudioScript(text: string): string {
  const withoutTables = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (trimmed.startsWith("|")) return false;
      if (/^:?-{2,}:?$/.test(trimmed.replace(/\|/g, "").trim())) return false;
      return true;
    })
    .join("\n");

  const sections = withoutTables
    .replace(/\r\n/g, "\n")
    .replace(/\*\*Image Analysis:\*\*[\s\S]*?(?=\n\n---|\n##|\n\*\*[A-Z]|\nSPOKEN:|\nHOOK:|\nVISUAL:|\nCTA:|\nCAPTIONS:|$)/gi, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^---+\s*$/gm, "")
    .replace(/\*\*Production Notes\*\*[\s\S]*$/i, "")
    .replace(/\*\*4-Second Squeeze Version\*\*[\s\S]*$/i, "")
    .replace(/\*\*Platform optimization:\*\*[\s\S]*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (sections.length > 8_000) {
    return compressStudioScriptText(sections);
  }

  return sections;
}

/** Best display string for a node's generated or draft text fields. */
export function studioNodeDisplayText(
  node: { type: string; data: { output?: string; scriptText?: string; prompt?: string } },
): string {
  const raw =
    node.type === "prompt"
      ? node.data.output || node.data.scriptText || node.data.prompt
      : node.type === "character"
        ? node.data.output || node.data.scriptText
        : node.data.output || node.data.scriptText || node.data.prompt;

  return formatStudioNodeText(raw);
}
