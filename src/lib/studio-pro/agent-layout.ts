import { formatRunCreditEstimate } from "@/lib/studio-pro/agent-credits";
import { topologicalSort, wouldCreateCycle } from "@/lib/studio-pro/graph";
import type { StudioEdge, StudioNode, StudioNodeType } from "@/lib/studio-pro/types";
import { getRenderedNodeHeight } from "@/lib/studio-pro/types";

const GRID = 12;
const COLUMN_GAP = 340;
const ROW_GAP = 48;
const CAMPAIGN_GAP = 160;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

const TYPE_LAYER: Record<StudioNodeType, number> = {
  audio: 0,
  prompt: 0,
  character: 0,
  image: 1,
  video: 2,
  schedule: 0,
  social: 1,
};

function snap(value: number) {
  return Math.round(value / GRID) * GRID;
}

export function canConnectNodeTypes(source: StudioNodeType, target: StudioNodeType) {
  if (source === target) return false;
  if (TYPE_LAYER[source] >= TYPE_LAYER[target]) return false;
  if (target === "image") return source === "prompt" || source === "character" || source === "audio";
  if (target === "video") {
    return source === "prompt" || source === "character" || source === "image" || source === "audio";
  }
  return false;
}

function computeNodeDepths(nodes: StudioNode[], edges: StudioEdge[]) {
  const depths = new Map<string, number>();
  nodes.forEach((node) => depths.set(node.id, TYPE_LAYER[node.type]));

  const incoming = new Map<string, string[]>();
  nodes.forEach((node) => incoming.set(node.id, []));
  edges.forEach((edge) => {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge.source);
    incoming.set(edge.target, list);
  });

  const queue = nodes.filter((node) => (incoming.get(node.id) ?? []).length === 0);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const depth = depths.get(node.id) ?? TYPE_LAYER[node.type];
    edges
      .filter((edge) => edge.source === node.id)
      .forEach((edge) => {
        const nextDepth = depth + 1;
        depths.set(edge.target, Math.max(depths.get(edge.target) ?? 0, nextDepth));
        const remaining = (incoming.get(edge.target) ?? []).filter((id) => id !== node.id);
        incoming.set(edge.target, remaining);
        if (remaining.length === 0) {
          const target = nodes.find((item) => item.id === edge.target);
          if (target) queue.push(target);
        }
      });
  }

  return depths;
}

export function layoutNodesLeftToRight(nodes: StudioNode[], edges: StudioEdge[]): StudioNode[] {
  if (nodes.length === 0) return nodes;

  const depths = computeNodeDepths(nodes, edges);
  const columns = new Map<number, StudioNode[]>();

  for (const node of nodes) {
    const depth = depths.get(node.id) ?? TYPE_LAYER[node.type];
    const column = columns.get(depth) ?? [];
    column.push(node);
    columns.set(depth, column);
  }

  const sortedDepths = Array.from(columns.keys()).sort((a, b) => a - b);
  const positioned = new Map<string, StudioNode>();

  for (const depth of sortedDepths) {
    const columnNodes = (columns.get(depth) ?? []).sort((a, b) => a.y - b.y || a.x - b.x);
    let y = ORIGIN_Y;

    for (const node of columnNodes) {
      const x = snap(ORIGIN_X + depth * COLUMN_GAP);
      const placed = { ...node, x, y: snap(y) };
      positioned.set(node.id, placed);
      y += getRenderedNodeHeight(node) + ROW_GAP;
    }
  }

  return nodes.map((node) => positioned.get(node.id) ?? node);
}

function isValidEdge(source: StudioNode, target: StudioNode, edges: StudioEdge[]) {
  if (!canConnectNodeTypes(source.type, target.type)) return false;
  if (wouldCreateCycle(source.id, target.id, edges)) return false;
  return true;
}

export function sanitizeFlowEdges(nodes: StudioNode[], edges: StudioEdge[]): StudioEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const kept: StudioEdge[] = [];

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    if (!isValidEdge(source, target, kept)) continue;
    if (kept.some((item) => item.source === edge.source && item.target === edge.target)) continue;
    kept.push({
      id: edge.id || `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
    });
  }

  return kept;
}

function findFlowComponents(nodes: StudioNode[], edges: StudioEdge[]) {
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => adjacency.set(node.id, new Set()));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const components: StudioNode[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const stack = [node.id];
    const ids = new Set<string>();

    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      ids.add(id);

      const neighbors = adjacency.get(id);
      if (neighbors) {
        for (const neighbor of Array.from(neighbors)) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
    }

    components.push(
      Array.from(ids)
        .map((id) => byId.get(id))
        .filter((item): item is StudioNode => Boolean(item))
        .sort((a, b) => a.y - b.y || a.x - b.x),
    );
  }

  return components;
}

export function inferPipelineEdges(nodes: StudioNode[]): StudioEdge[] {
  const inputs = nodes.filter((node) => TYPE_LAYER[node.type] === 0);
  const images = nodes.filter((node) => node.type === "image");
  const videos = nodes.filter((node) => node.type === "video");
  const edges: StudioEdge[] = [];

  const pushEdge = (sourceId: string, targetId: string) => {
    const source = nodes.find((node) => node.id === sourceId);
    const target = nodes.find((node) => node.id === targetId);
    if (!source || !target) return;
    if (!isValidEdge(source, target, edges)) return;
    if (edges.some((edge) => edge.source === sourceId && edge.target === targetId)) return;
    edges.push({ id: `e-${sourceId}-${targetId}`, source: sourceId, target: targetId });
  };

  if (images.length > 0) {
    for (const image of images) {
      for (const input of inputs) {
        pushEdge(input.id, image.id);
      }
    }
  }

  for (const video of videos) {
    if (images.length > 0) {
      for (const image of images) {
        pushEdge(image.id, video.id);
      }
    } else {
      for (const input of inputs) {
        pushEdge(input.id, video.id);
      }
    }
  }

  return edges;
}

export function organizeCanvas(
  nodes: StudioNode[],
  edges: StudioEdge[],
  options?: { rebuildEdges?: boolean },
) {
  const rebuildEdges = options?.rebuildEdges ?? true;
  const components = findFlowComponents(nodes, edges);
  const nextNodes: StudioNode[] = [];
  const nextEdges: StudioEdge[] = [];
  let yOffset = ORIGIN_Y;

  for (const component of components) {
    const componentEdgeSource = edges.filter(
      (edge) =>
        component.some((node) => node.id === edge.source) &&
        component.some((node) => node.id === edge.target),
    );
    const componentEdges = rebuildEdges
      ? inferPipelineEdges(component)
      : sanitizeFlowEdges(component, componentEdgeSource);
    const laidOut = layoutNodesLeftToRight(component, componentEdges);
    const minY = Math.min(...laidOut.map((node) => node.y));
    const maxY = Math.max(...laidOut.map((node) => node.y + getRenderedNodeHeight(node)));
    const shifted = laidOut.map((node) => ({
      ...node,
      y: snap(node.y - minY + yOffset),
    }));

    nextNodes.push(...shifted);
    nextEdges.push(...componentEdges);
    yOffset += maxY - minY + CAMPAIGN_GAP;
  }

  const removedEdges = edges.length - sanitizeFlowEdges(nodes, edges).length;
  const parts = [
    `Organized ${components.length} campaign${components.length === 1 ? "" : "s"} (${nextNodes.length} nodes)`,
    rebuildEdges ? `rebuilt ${nextEdges.length} connection(s)` : `kept ${nextEdges.length} valid connection(s)`,
  ];
  if (!rebuildEdges && removedEdges > 0) {
    parts.push(`dropped ${removedEdges} invalid edge(s)`);
  }

  return {
    nodes: nextNodes,
    edges: nextEdges,
    message: parts.join(", ") + ".",
  };
}

export function buildRunAllPlan(
  nodes: StudioNode[],
  edges: StudioEdge[],
  creditsRemaining?: number | null,
) {
  if (nodes.length === 0) return "Nothing to run — the canvas is empty.";

  const sorted = topologicalSort(nodes, edges);
  const steps = sorted.map((node) => {
    const label =
      node.type === "prompt"
        ? "Text"
        : node.type === "character"
          ? "Character"
          : node.type.charAt(0).toUpperCase() + node.type.slice(1);
    return label;
  });

  const uniqueSteps = steps.join(" → ");
  const running = nodes.filter((node) => node.data.status === "running").length;

  return [
    `Run ${sorted.length} node(s) in order: ${uniqueSteps}.`,
    formatRunCreditEstimate(nodes, edges, creditsRemaining),
    running > 0 ? `${running} node(s) may re-run if they were stuck.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
