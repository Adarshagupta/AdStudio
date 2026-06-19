import { topologicalSort } from "@/lib/studio-pro/graph";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const NODE_CREDIT_COST: Record<StudioNode["type"], number> = {
  prompt: 1,
  character: 1,
  image: 1,
  audio: 1,
  video: 2,
  schedule: 0,
  social: 1,
};

export function estimateNodeCredits(node: StudioNode) {
  return NODE_CREDIT_COST[node.type] ?? 1;
}

export function estimateRunCredits(nodes: StudioNode[], edges: StudioEdge[]) {
  const sorted = topologicalSort(nodes, edges);
  return sorted.reduce((total, node) => total + estimateNodeCredits(node), 0);
}

export function formatRunCreditEstimate(
  nodes: StudioNode[],
  edges: StudioEdge[],
  creditsRemaining?: number | null,
) {
  const estimated = estimateRunCredits(nodes, edges);

  const parts = [`Estimated cost: ~${estimated} credit${estimated === 1 ? "" : "s"}`];
  if (typeof creditsRemaining === "number") {
    parts.push(`You have ${creditsRemaining} remaining`);
    if (creditsRemaining < estimated) {
      parts.push("This run may exceed your balance");
    }
  }

  return parts.join(" · ") + ".";
}
