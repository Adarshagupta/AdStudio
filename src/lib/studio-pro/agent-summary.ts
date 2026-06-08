import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";
import { nodeTypeLabel } from "@/lib/studio-pro/agent-tools";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export type StudioFlowSummary = {
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    prompt?: string;
    characterName?: string;
    model?: string;
    hasOutput: boolean;
    outputPreview?: string;
    imageUrl?: string;
    videoUrl?: string;
    error?: string;
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

function truncate(value: string, max = 200) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function buildStudioFlowSummary(nodes: StudioNode[], edges: StudioEdge[]): StudioFlowSummary {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes: nodes.map((node) => {
      const data = node.data ?? {};
      const output = studioNodeDisplayText({ type: node.type, data });
      return {
        id: node.id,
        type: node.type,
        title: nodeTypeLabel(node.type),
        status: data.status ?? "idle",
        prompt: data.prompt?.trim() || undefined,
        characterName: data.characterName?.trim() || undefined,
        model: data.model || undefined,
        hasOutput: Boolean(output || data.imageUrl || data.videoUrl || data.audioUrl),
        outputPreview: output ? truncate(output) : undefined,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        error: data.error,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function formatFlowSummaryForPrompt(summary: StudioFlowSummary) {
  if (summary.nodeCount === 0) {
    return "Canvas is empty — no nodes yet.";
  }

  const nodeLines = summary.nodes.map((node) => {
    const parts = [
      `- ${node.id} (${node.title}, status: ${node.status}${node.status === "running" ? " — may be stale; use run_node" : ""})`,
      node.prompt ? `  prompt: ${truncate(node.prompt, 120)}` : null,
      node.characterName ? `  character: ${node.characterName}` : null,
      node.model ? `  model: ${node.model}` : null,
      node.outputPreview ? `  output: ${node.outputPreview}` : null,
      node.imageUrl ? `  image: ${node.imageUrl}` : null,
      node.videoUrl ? `  video: ${node.videoUrl}` : null,
      node.error ? `  error: ${node.error}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  });

  const edgeLines =
    summary.edges.length > 0
      ? summary.edges.map((e) => `  ${e.source} → ${e.target}`)
      : ["  (no connections)"];

  return [
    `Nodes (${summary.nodeCount}):`,
    ...nodeLines,
    `Connections (${summary.edgeCount}):`,
    ...edgeLines,
  ].join("\n");
}
