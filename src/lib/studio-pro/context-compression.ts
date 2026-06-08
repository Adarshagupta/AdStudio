import { stripEmbeddedMediaUrls, truncateTextPrompt } from "@/lib/text-prompt";

export type ContextSectionPriority = "critical" | "high" | "normal" | "low";

export type ContextSection = {
  label: string;
  content: string;
  priority: ContextSectionPriority;
};

export const STUDIO_CONTEXT_BUDGETS = {
  script: 10_000,
  visualDirection: 6_000,
  scenePrompt: 8_000,
  characterBible: 1_200,
  sectionBrief: 800,
  sectionProfile: 600,
  sectionImageScene: 400,
  sectionShotNotes: 500,
  composeNode: 2_500,
  continuityBlock: 1_400,
} as const;

const PRIORITY_WEIGHT: Record<ContextSectionPriority, number> = {
  critical: 4,
  high: 2.5,
  normal: 1,
  low: 0.5,
};

const CONSISTENCY_KEYWORDS = [
  "character",
  "wardrobe",
  "outfit",
  "wearing",
  "hair",
  "face",
  "lighting",
  "consistent",
  "continuity",
  "same person",
  "same look",
  "color grade",
  "brand",
  "product",
  "setting",
  "background",
  "segment",
  "clip",
  "scene",
  "hook",
  "cta",
  "voice",
  "tone",
  "style",
  "camera",
  "aspect",
  "wardrobe",
  "makeup",
  "skin",
  "logo",
];

function scoreContextLine(line: string, index: number, total: number) {
  const trimmed = line.trim();
  if (!trimmed) return -1;

  const lower = trimmed.toLowerCase();
  let score = 0;

  for (const keyword of CONSISTENCY_KEYWORDS) {
    if (lower.includes(keyword)) score += 3;
  }

  if (index < 4) score += 2;
  if (index >= total - 4) score += 2;
  if (/^(hook|cta|spoken|visual|character|segment|clip|scene|part)\b/i.test(trimmed)) score += 4;
  if (trimmed.startsWith("@")) score += 2;
  if (/^\d+[\).:]/.test(trimmed)) score += 1;

  return score;
}

/** Preserve continuity-critical lines when prompts exceed model budgets. */
export function compressStudioContextText(
  text: string,
  maxChars: number,
  options?: { label?: string },
): string {
  const cleaned = stripEmbeddedMediaUrls(text).trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;

  const lines = cleaned.split("\n");
  const scored = lines.map((line, index) => ({
    line,
    index,
    score: scoreContextLine(line, index, lines.length),
  }));

  const mustKeep = new Set<number>();
  const nonEmpty = scored.filter((item) => item.line.trim() && item.score >= 0);

  for (const item of nonEmpty.slice(0, 3)) mustKeep.add(item.index);
  for (const item of nonEmpty.slice(-3)) mustKeep.add(item.index);

  let used = Array.from(mustKeep)
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .join("\n").length;

  const candidates = scored
    .filter((item) => !mustKeep.has(item.index) && item.line.trim() && item.score >= 0)
    .sort((a, b) => b.score - a.score);

  const selected = new Set(mustKeep);

  for (const candidate of candidates) {
    const lineCost = candidate.line.length + 1;
    if (used + lineCost > maxChars - 96) continue;
    selected.add(candidate.index);
    used += lineCost;
  }

  let compressed = Array.from(selected)
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .join("\n");

  const omitted = cleaned.length - compressed.length;
  const suffix = options?.label
    ? `\n\n[${options.label}: ${omitted.toLocaleString()} chars compressed — identity & continuity lines kept.]`
    : `\n\n[Context compressed: ${omitted.toLocaleString()} chars omitted — key consistency lines kept.]`;

  if (compressed.length + suffix.length > maxChars) {
    compressed = compressed.slice(0, Math.max(0, maxChars - suffix.length));
  }

  return `${compressed}${suffix}`;
}

export function compressContextSections(sections: ContextSection[], totalBudget: number): string {
  const nonEmpty = sections.filter((section) => section.content.trim());
  if (!nonEmpty.length) return "";

  const totalWeight = nonEmpty.reduce((sum, section) => sum + PRIORITY_WEIGHT[section.priority], 0);
  const parts: string[] = [];
  let remaining = totalBudget;

  const ordered = [...nonEmpty].sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
  );

  for (let index = 0; index < ordered.length; index += 1) {
    const section = ordered[index]!;
    const weight = PRIORITY_WEIGHT[section.priority];
    const slotsLeft = ordered.length - index;
    const minBudget = section.priority === "critical" ? 280 : 96;
    const share = Math.max(minBudget, Math.floor((weight / totalWeight) * totalBudget));
    const budget = Math.min(share, Math.max(minBudget, remaining - (slotsLeft - 1) * 96));

    const compressed = compressStudioContextText(section.content, budget, { label: section.label });
    if (compressed) {
      parts.push(`${section.label}:\n${compressed}`);
      remaining -= compressed.length + 2;
    }
  }

  return truncateTextPrompt(parts.join("\n\n"), totalBudget + 400);
}

export function compressStudioScriptText(
  text: string,
  maxChars: number = STUDIO_CONTEXT_BUDGETS.script,
): string {
  return compressStudioContextText(stripEmbeddedMediaUrls(text).trim(), maxChars, {
    label: "Script",
  });
}
