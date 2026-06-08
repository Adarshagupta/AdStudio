import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";
import type { StudioNode } from "@/lib/studio-pro/types";

export type AgentToolExecutionResult = {
  ok: boolean;
  message: string;
  outputText?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  nodeId?: string;
};

export type AgentToolMessageExtras = {
  outputText?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  nodeId?: string;
};

function truncate(value: string, max = 2_000) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[Truncated]`;
}

function isMediaUrl(value: string) {
  const trimmed = value.trim();
  return (
    /^https?:\/\/\S+$/i.test(trimmed) ||
    /\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v|mp3|wav|m4a)(\?|$)/i.test(trimmed)
  );
}

export function shouldShowAgentToolOutputText(
  outputText: string | undefined,
  extras: { imageUrl?: string; videoUrl?: string; audioUrl?: string },
) {
  if (!outputText?.trim()) return false;

  const trimmed = outputText.trim();
  if (extras.imageUrl && trimmed === extras.imageUrl.trim()) return false;
  if (extras.videoUrl && trimmed === extras.videoUrl.trim()) return false;
  if (extras.audioUrl && trimmed === extras.audioUrl.trim()) return false;
  if (isMediaUrl(trimmed)) return false;

  return true;
}

export function buildNodeRunToolResult(node: StudioNode): AgentToolExecutionResult {
  const imageUrl = node.data.imageUrl?.trim();
  const videoUrl = node.data.videoUrl?.trim();
  const audioUrl = node.data.audioUrl?.trim();

  const isTextNode = node.type === "prompt" || node.type === "character";
  const rawText = isTextNode ? studioNodeDisplayText(node) : "";
  const outputText =
    rawText && !isMediaUrl(rawText) ? truncate(rawText) : undefined;

  let message = `Node ${node.id} completed (${node.data.status ?? "done"}).`;
  if (outputText) {
    message += ` Script ready.`;
  } else if (imageUrl) {
    message += ` Image ready on canvas.`;
  } else if (videoUrl) {
    message += ` Video ready on canvas.`;
  } else if (audioUrl) {
    message += ` Audio ready on canvas.`;
  } else {
    message += ` No output captured.`;
  }

  return {
    ok: true,
    message,
    outputText,
    imageUrl,
    videoUrl,
    audioUrl,
    nodeId: node.id,
  };
}

/** Parse legacy tool messages that inlined output in `content`. */
export function parseLegacyToolMessage(
  toolName: string,
  content: string,
): AgentToolMessageExtras {
  if (toolName !== "run_node" && toolName !== "run_all") {
    return {};
  }

  const nodeId = content.match(/Node\s+([^\s]+)\s+completed/i)?.[1];
  const imageUrl = content.match(/Image:\s*(https?:\/\/\S+)/i)?.[1];
  const videoUrl = content.match(/Video:\s*(https?:\/\/\S+)/i)?.[1];
  const audioUrl = content.match(/Audio:\s*(https?:\/\/\S+)/i)?.[1];
  const outputMatch = content.match(/Output:\s*([\s\S]+)/i);
  const rawOutput = outputMatch?.[1]?.trim().replace(/…$/, "");
  const outputText =
    rawOutput && !isMediaUrl(rawOutput) ? truncate(rawOutput) : undefined;

  return {
    nodeId,
    imageUrl,
    videoUrl,
    audioUrl,
    outputText,
  };
}
