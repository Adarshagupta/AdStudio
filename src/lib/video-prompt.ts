import type { GenerationFormat } from "@prisma/client";

import {
  compressStudioContextText,
  compressStudioScriptText,
} from "@/lib/studio-pro/context-compression";
import { stripEmbeddedMediaUrls } from "@/lib/text-prompt";

/** LTX and most video providers cap the prompt field at 5000 characters. */
export const PROVIDER_VIDEO_PROMPT_MAX_CHARS = 4_900;

export function fitProviderVideoPrompt(
  prompt: string,
  maxChars = PROVIDER_VIDEO_PROMPT_MAX_CHARS,
): string {
  const trimmed = stripEmbeddedMediaUrls(prompt).trim();
  if (trimmed.length <= maxChars) return trimmed;

  const scriptMarker = "SCRIPT (mandatory):";
  const visualMarker = "VISUAL DIRECTION:";
  const shotMarker = "SHOT NOTES:";
  const formatMarker = "\nFormat:";

  const scriptIdx = trimmed.indexOf(scriptMarker);
  const visualIdx = trimmed.indexOf(visualMarker);
  const shotIdx = trimmed.indexOf(shotMarker);
  const formatIdx = trimmed.indexOf(formatMarker);

  if (scriptIdx >= 0 && visualIdx > scriptIdx) {
    const preamble = trimmed.slice(0, scriptIdx).trim();
    const scriptBody = trimmed.slice(scriptIdx + scriptMarker.length, visualIdx).trim();
    const visualEnd = shotIdx > visualIdx ? shotIdx : formatIdx > visualIdx ? formatIdx : trimmed.length;
    const visualBody = trimmed.slice(visualIdx + visualMarker.length, visualEnd).trim();
    const shotBody =
      shotIdx >= 0
        ? (formatIdx > shotIdx ? trimmed.slice(shotIdx + shotMarker.length, formatIdx) : trimmed.slice(shotIdx + shotMarker.length)).trim()
        : "";
    const footer = formatIdx >= 0 ? trimmed.slice(formatIdx).trim() : "";

    const fixedOverhead =
      preamble.length +
      footer.length +
      scriptMarker.length +
      visualMarker.length +
      (shotBody ? shotMarker.length : 0) +
      24;
    const flexibleBudget = Math.max(900, maxChars - fixedOverhead);
    const shotBudget = shotBody ? Math.min(480, Math.floor(flexibleBudget * 0.12)) : 0;
    const visualBudget = Math.min(2_000, Math.floor((flexibleBudget - shotBudget) * 0.4));
    const scriptBudget = flexibleBudget - shotBudget - visualBudget;

    const parts = [
      preamble,
      `${scriptMarker}\n${compressStudioScriptText(scriptBody, scriptBudget)}`,
      `${visualMarker}\n${compressStudioContextText(visualBody, visualBudget, { label: "Visual" })}`,
      shotBody ? `${shotMarker}\n${compressStudioContextText(shotBody, shotBudget, { label: "Shot notes" })}` : "",
      footer,
    ].filter(Boolean);

    const result = parts.join("\n\n");
    if (result.length <= maxChars) return result;
    return compressStudioContextText(result, maxChars, { label: "Video prompt" });
  }

  return compressStudioContextText(trimmed, maxChars, { label: "Video prompt" });
}

export function buildStrictStudioVideoPrompt(input: {
  format: GenerationFormat;
  scriptText: string;
  visualDirection: string;
  shotNotes?: string;
  captionStyle?: string;
  musicEnabled?: boolean;
  hasReferenceImage?: boolean;
  hasReferenceVideo?: boolean;
  videoMode?: string;
  segmentIndex?: number;
  segmentCount?: number;
}) {
  const music =
    input.musicEnabled === false
      ? "No background music unless required for pacing."
      : "Subtle background music only; it must not overpower the script.";

  const referenceRules = [
    input.hasReferenceImage
      ? "REFERENCE IMAGE: Treat the provided image as the first frame. Preserve subject identity, wardrobe, lighting, and composition while animating motion described below."
      : null,
    input.hasReferenceVideo
      ? input.videoMode === "video-extend"
        ? "EXTEND VIDEO: Continue seamlessly from the last frame of the input clip. Match style, lighting, and subject identity."
        : input.videoMode === "video-edit"
          ? "EDIT VIDEO: Apply the script and visual direction as edits to the connected clip. Keep temporal consistency across frames."
          : "REFERENCE VIDEO: Preserve motion structure and timing from the input clip. Apply the script, appearance notes, and shot notes to the transformed output."
      : null,
    input.videoMode === "reference-to-video"
      ? "MULTI-IMAGE REFERENCE: Preserve identity and style from all reference images (@image1, @image2, …) while following the script."
      : null,
    input.segmentIndex && input.segmentIndex > 1
      ? `SEGMENT ${input.segmentIndex}${input.segmentCount ? ` of ${input.segmentCount}` : ""}: This clip joins with prior segments in post. Match character identity, wardrobe, lighting, and color grade. Open on the prior clip's end state; close on an edit-friendly frame.`
      : input.segmentCount && input.segmentCount > 1
        ? "SEGMENT 1: Establish the look, talent, wardrobe, and setting for downstream clips to match."
        : null,
  ].filter(Boolean);

  return [
    "Generate a short-form marketing video.",
    "CRITICAL: Follow the SCRIPT exactly. Spoken lines and captions must match the script wording. Do not paraphrase, skip, or invent dialogue.",
    "Use VISUAL DIRECTION only for actor look, setting, product shots, camera movement, and mood.",
    "Do not add claims, scenes, or characters that are not implied by the script and visual direction.",
    ...referenceRules,
    "",
    "SCRIPT (mandatory):",
    input.scriptText.trim(),
    "",
    input.visualDirection.trim()
      ? `VISUAL DIRECTION:\n${input.visualDirection.trim()}`
      : "VISUAL DIRECTION: Match a UGC talking-head ad style consistent with the script.",
    input.shotNotes?.trim() ? `\nSHOT NOTES:\n${input.shotNotes.trim()}` : "",
    "",
    `Format: ${input.format}`,
    `Captions: ${input.captionStyle ?? "Clean"} — display script lines as readable captions.`,
    `Audio: ${music}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDashboardVideoPrompt(input: {
  format: GenerationFormat;
  scriptText: string;
  prompt: string;
  captionStyle?: string;
  musicEnabled?: boolean;
}) {
  return [
    formatInstruction(input.format),
    `Ad script:\n${input.scriptText}`,
    `Creative brief: ${input.prompt}`,
    `Caption style: ${input.captionStyle ?? "Clean"}`,
    `Music: ${input.musicEnabled === false ? "No music" : "Include tasteful upbeat music"}`,
    "Generate a polished short-form marketing video. Avoid unreadable tiny text. Keep product shots and captions clear.",
  ].join("\n\n");
}

function formatInstruction(format: GenerationFormat) {
  if (format === "BRAIN_ROT") {
    return "Create a short, high-retention brain-rot style ad with a fast hook, kinetic captions, and product proof.";
  }
  if (format === "STATIC") {
    return "Create a concise static ad concept with headline, supporting copy, and visual direction.";
  }
  if (format === "REVIEW") {
    return "Create a review-style ad script with a believable pain point, proof, objection handling, and CTA.";
  }
  return "Create a UGC talking-head ad script with hook, problem, product demo, proof, and CTA.";
}
