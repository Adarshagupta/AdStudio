import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export type AgentCanvasSnapshot = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  savedAt: string;
  label?: string;
};

export function cloneCanvasSnapshot(nodes: StudioNode[], edges: StudioEdge[], label?: string): AgentCanvasSnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    savedAt: new Date().toISOString(),
    label,
  };
}
