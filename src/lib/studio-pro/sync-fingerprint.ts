import type { StudioViewport } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export type StudioFlowSyncState = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

function graphSnapshot(state: StudioFlowSyncState) {
  const nodes = state.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    title: node.title,
    zIndex: node.zIndex,
    data: node.data,
  }));

  return JSON.stringify({
    nodes,
    edges: state.edges,
  });
}

/** Graph content only — viewport changes must not trigger remote apply. */
export function studioFlowFingerprint(state: StudioFlowSyncState) {
  return graphSnapshot(state);
}

export function parseRevisionTime(updatedAt: string) {
  const time = Date.parse(updatedAt);
  return Number.isNaN(time) ? 0 : time;
}

export function isRemoteRevisionStale(
  incomingUpdatedAt: string,
  lastAppliedUpdatedAt: string | null,
  lastPublishedUpdatedAt: string | null,
) {
  const incoming = parseRevisionTime(incomingUpdatedAt);
  if (!lastAppliedUpdatedAt && !lastPublishedUpdatedAt) return false;

  const applied = lastAppliedUpdatedAt ? parseRevisionTime(lastAppliedUpdatedAt) : 0;
  const published = lastPublishedUpdatedAt ? parseRevisionTime(lastPublishedUpdatedAt) : 0;
  const baseline = Math.max(applied, published);

  return incoming < baseline;
}
