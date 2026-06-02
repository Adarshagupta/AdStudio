import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";

export function getPortPosition(node: StudioNode, side: "input" | "output", height = getNodeHeight(node)) {
  const y = node.y + height / 2;
  const x = side === "input" ? node.x : node.x + node.width;
  return { x, y };
}

export function getIncomingEdges(nodeId: string, edges: StudioEdge[]) {
  return edges.filter((edge) => edge.target === nodeId);
}

export function getOutgoingEdges(nodeId: string, edges: StudioEdge[]) {
  return edges.filter((edge) => edge.source === nodeId);
}

export function buildEdgePath(source: StudioNode, target: StudioNode) {
  const from = getPortPosition(source, "output");
  const to = getPortPosition(target, "input");
  const dx = Math.max(80, Math.abs(to.x - from.x) * 0.45);

  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

export function buildPreviewPath(source: StudioNode, target: { x: number; y: number }) {
  const from = getPortPosition(source, "output");
  const dx = Math.max(80, Math.abs(target.x - from.x) * 0.45);

  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${target.x - dx} ${target.y}, ${target.x} ${target.y}`;
}

export function wouldCreateCycle(source: string, target: string, edges: StudioEdge[]) {
  if (source === target) return true;

  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.source === current).forEach((edge) => stack.push(edge.target));
  }

  return false;
}

export function findSnapTarget(
  point: { x: number; y: number },
  nodes: StudioNode[],
  sourceId: string,
  threshold = 44,
) {
  let closest: { nodeId: string; x: number; y: number; distance: number } | null = null;

  for (const node of nodes) {
    if (node.id === sourceId) continue;
    const port = getPortPosition(node, "input");
    const distance = Math.hypot(point.x - port.x, point.y - port.y);
    if (distance <= threshold && (!closest || distance < closest.distance)) {
      closest = { nodeId: node.id, x: port.x, y: port.y, distance };
    }
  }

  return closest;
}

export function getUpstreamNodes(nodeId: string, nodes: StudioNode[], edges: StudioEdge[]) {
  const sourceIds = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
  return nodes.filter((node) => sourceIds.includes(node.id));
}

export function composePrompt(nodes: StudioNode[]) {
  return nodes
    .map((node) => {
      if (node.type === "prompt") {
        const text = node.data.scriptText || node.data.output || node.data.prompt;
        return text ? `Brief: ${text}` : null;
      }
      if (node.type === "character") {
        const text = node.data.output || node.data.scriptText;
        if (text) return `Character profile: ${text}`;
        const name = node.data.characterName?.trim();
        const brief = node.data.prompt?.trim();
        if (!name && !brief) return null;
        if (name && brief) return `Character (${name}): ${brief}`;
        return name ? `Character: ${name}` : `Character brief: ${brief}`;
      }
      if (node.type === "audio") {
        const script = node.data.prompt?.trim() || node.data.output?.trim();
        if (script) return `Voiceover script: ${script.slice(0, 500)}`;
        const title = node.data.audioTitle?.trim();
        const style = node.data.voiceStyle?.trim();
        if (!title && !style) return null;
        if (title && style) return `Audio direction (${style}): ${title}`;
        return style ? `Audio direction: ${style}` : `Audio: ${title}`;
      }
      if (node.type === "image" && node.data.imageUrl) {
        return `Image reference: ${node.data.imageUrl}`;
      }
      if (node.type === "image" && node.data.output) {
        return `Image context: ${node.data.output.slice(0, 240)}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");
}

export function getNodeLocalContent(node: StudioNode) {
  switch (node.type) {
    case "prompt":
      return (node.data.scriptText || node.data.output || node.data.prompt || "").trim();
    case "character":
      if (node.data.output?.trim()) return node.data.output.trim();
      {
        const name = node.data.characterName?.trim();
        const brief = node.data.prompt?.trim();
        if (name && brief) return `${name}: ${brief}`;
        return name || brief || "";
      }
    case "audio":
      return (node.data.prompt || node.data.output || "").trim();
    case "image":
    case "video":
      return (node.data.prompt || "").trim();
    default:
      return "";
  }
}

export function resolveNodePrompt(node: StudioNode, upstream: StudioNode[]) {
  const upstreamContext = composePrompt(upstream);
  const local = getNodeLocalContent(node);

  if (local && upstreamContext) {
    return `${upstreamContext}\n\n${local}`;
  }

  return local || upstreamContext || "";
}

export function extractSpeakableText(node: StudioNode) {
  const direct =
    node.data.scriptText?.trim() ||
    node.data.output?.trim() ||
    node.data.prompt?.trim() ||
    "";

  if (direct.length >= 3) {
    return direct;
  }

  if (node.type === "character") {
    const name = node.data.characterName?.trim();
    const brief = node.data.prompt?.trim();
    if (brief) return brief;
    if (name) return `Hi, I'm ${name}.`;
  }

  if (node.type === "audio") {
    const style = node.data.voiceStyle?.trim();
    const title = node.data.audioTitle?.trim();
    if (style && style.length >= 3) return style;
    if (title && title.length >= 3) return title;
    if (style && title) return `${title}. ${style}`;
  }

  return direct;
}

export function resolveAudioSpeech(node: StudioNode, upstream: StudioNode[]) {
  const localScript = node.data.prompt?.trim();
  if (localScript && localScript.length >= 3) {
    return localScript;
  }

  const localStyle = node.data.voiceStyle?.trim();
  if (localStyle && localStyle.length >= 3) {
    return localStyle;
  }

  for (const upstreamNode of upstream) {
    const text = extractSpeakableText(upstreamNode);
    if (text.length >= 3) {
      return text;
    }
  }

  const title = node.data.audioTitle?.trim();
  if (title && title.length >= 3) {
    return title;
  }

  const combined = [node.data.audioTitle?.trim(), node.data.voiceStyle?.trim()].filter(Boolean).join(". ");
  if (combined.length >= 3) {
    return combined;
  }

  return "";
}

export function buildAudioDirection(node: StudioNode, upstream: StudioNode[]) {
  return [
    composePrompt(upstream),
    node.data.audioTitle?.trim() ? `Track title: ${node.data.audioTitle}` : "",
    node.data.voiceStyle?.trim() ? `Voice style: ${node.data.voiceStyle}` : "",
    node.data.prompt?.trim() ? `Notes: ${node.data.prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function topologicalSort(nodes: StudioNode[], edges: StudioEdge[]) {
  const incoming = new Map<string, number>();
  nodes.forEach((node) => incoming.set(node.id, 0));
  edges.forEach((edge) => incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1));

  const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  const sorted: StudioNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    edges
      .filter((edge) => edge.source === node.id)
      .forEach((edge) => {
        const count = (incoming.get(edge.target) ?? 1) - 1;
        incoming.set(edge.target, count);
        if (count === 0) {
          const target = nodes.find((item) => item.id === edge.target);
          if (target) queue.push(target);
        }
      });
  }

  return sorted.length === nodes.length ? sorted : nodes;
}
