import type { StudioViewport } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import { normalizeStudioNode } from "@/lib/studio-pro/types";

export function mergeRemoteStudioState(
  local: {
    nodes: StudioNode[];
    edges: StudioEdge[];
    viewport: StudioViewport;
  },
  remote: {
    nodes: StudioNode[];
    edges: StudioEdge[];
    viewport: StudioViewport;
  },
  options: { lockedNodeIds?: string[] },
) {
  const locked = new Set(options.lockedNodeIds ?? []);
  const localById = new Map(local.nodes.map((node) => [node.id, node]));

  const remoteNodes =
    remote.nodes.length > 0 || local.nodes.length === 0 ? remote.nodes : local.nodes;

  const nodes = remoteNodes.map((node, index) => {
    if (locked.has(node.id)) {
      const localNode = localById.get(node.id);
      return localNode ? normalizeStudioNode(localNode, index) : normalizeStudioNode(node, index);
    }
    return normalizeStudioNode(node, index);
  });

  return {
    nodes,
    edges: remote.edges,
    // Pan/zoom are per-user; never overwrite a collaborator's viewport from sync.
    viewport: local.viewport,
  };
}
