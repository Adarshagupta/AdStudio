import { cloudflareModels } from "@/lib/cloudflare/models";
import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";

export type StudioNodeType = "prompt" | "character" | "image" | "audio" | "video";

export type StudioNode = {
  id: string;
  type: StudioNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  zIndex: number;
  data: StudioNodeData;
};

export type StudioNodeData = {
  prompt?: string;
  model?: string;
  output?: string;
  scriptText?: string;
  imageUrl?: string;
  videoUrl?: string;
  jobId?: string;
  aspectRatio?: string;
  resolution?: string;
  duration?: number;
  /** When a video is connected: auto, edit (retake), extend, or control (retake). */
  videoOperation?: "auto" | "edit" | "extend" | "control";
  outputFormat?: string;
  characterName?: string;
  voiceStyle?: string;
  audioTitle?: string;
  audioUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  status?: "idle" | "running" | "done" | "failed";
  mediaSource?: "upload" | "generated";
  error?: string;
};

export type StudioEdge = {
  id: string;
  source: string;
  target: string;
};

export const nodeMeta: Record<
  StudioNodeType,
  { title: string; subtitle: string; width: number; height: number; color: string }
> = {
  prompt: {
    title: "Text",
    subtitle: "Kimi 2.6",
    width: 300,
    height: 200,
    color: "from-violet-500/20 to-violet-500/5",
  },
  character: {
    title: "Character",
    subtitle: "Kimi 2.6",
    width: 300,
    height: 200,
    color: "from-pink-500/20 to-pink-500/5",
  },
  image: {
    title: "Image",
    subtitle: "Stable Diffusion XL",
    width: 340,
    height: 260,
    color: "from-sky-500/20 to-sky-500/5",
  },
  audio: {
    title: "Text to Speech",
    subtitle: "MeloTTS",
    width: 320,
    height: 220,
    color: "from-amber-500/20 to-amber-500/5",
  },
  video: {
    title: "Video",
    subtitle: "LTX-2.3",
    width: 340,
    height: 280,
    color: "from-emerald-500/20 to-emerald-500/5",
  },
};

export function createNode(type: StudioNodeType, x: number, y: number, partial?: Partial<StudioNode>): StudioNode {
  const meta = nodeMeta[type];
  const { data: partialData, ...partialRest } = partial ?? {};
  const node: StudioNode = {
    id: partialRest.id ?? `${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    x,
    y,
    width: meta.width,
    height: meta.height,
    title: partialRest.title ?? meta.title,
    subtitle: partialRest.subtitle ?? meta.subtitle,
    zIndex: partialRest.zIndex ?? 0,
    data: {
      model:
        type === "prompt" || type === "character"
          ? cloudflareModels.text.default
          : type === "image"
            ? "@cf/stabilityai/stable-diffusion-xl-base-1.0"
            : type === "video"
              ? ""
              : type === "audio"
                ? "@cf/myshell-ai/melotts"
                : "custom",
      aspectRatio: "9:16",
      resolution: type === "video" ? "480p" : "1K",
      duration: type === "video" ? 5 : undefined,
      outputFormat: "png",
      prompt: "",
      characterName: "",
      voiceStyle: "",
      audioTitle: "",
      status: "idle",
      ...partialData,
    },
    ...partialRest,
  };

  return {
    ...node,
    height: getRenderedNodeHeight(node),
  };
}

export const defaultNodes: StudioNode[] = [];

export const defaultEdges: StudioEdge[] = [];

export function aspectRatioToHeight(aspectRatio: string | undefined, width: number) {
  const [w, h] = (aspectRatio ?? "9:16").split(":").map(Number);
  if (!w || !h) return width * (16 / 9);
  return width * (h / w);
}

const NODE_BODY_PADDING = 20;
const NODE_PROMPT_BAR_HEIGHT = 52;
const EMPTY_MEDIA_PREVIEW_MAX = 160;
const MAX_MEDIA_DISPLAY_HEIGHT = 320;

export function getNodeBounds(node: StudioNode) {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: getNodeHeight(node),
  };
}

export function nodesOverlap(a: StudioNode, b: StudioNode, padding = 12) {
  if (a.id === b.id) return false;
  const boundsA = getNodeBounds(a);
  const boundsB = getNodeBounds(b);

  return !(
    boundsA.x + boundsA.width + padding <= boundsB.x ||
    boundsB.x + boundsB.width + padding <= boundsA.x ||
    boundsA.y + boundsA.height + padding <= boundsB.y ||
    boundsB.y + boundsB.height + padding <= boundsA.y
  );
}

function scaleMediaHeight(contentWidth: number, mediaWidth: number, mediaHeight: number) {
  const scaledHeight = contentWidth * (mediaHeight / mediaWidth);
  if (scaledHeight <= MAX_MEDIA_DISPLAY_HEIGHT) {
    return scaledHeight;
  }
  return MAX_MEDIA_DISPLAY_HEIGHT;
}

export function getMediaPreviewHeight(node: StudioNode, contentWidth: number) {
  if (node.type === "image" && node.data.imageWidth && node.data.imageHeight) {
    return scaleMediaHeight(contentWidth, node.data.imageWidth, node.data.imageHeight);
  }
  if (node.type === "video" && node.data.videoWidth && node.data.videoHeight) {
    return scaleMediaHeight(contentWidth, node.data.videoWidth, node.data.videoHeight);
  }
  if (node.type === "image" || node.type === "video") {
    const aspectHeight = aspectRatioToHeight(node.data.aspectRatio, contentWidth);
    return Math.min(EMPTY_MEDIA_PREVIEW_MAX, aspectHeight, MAX_MEDIA_DISPLAY_HEIGHT);
  }
  return 80;
}

const MAX_TEXT_PREVIEW_HEIGHT = 480;
const MAX_TEXT_PREVIEW_LINES = 36;

function textBlockHeight(text: string | undefined, emptyHeight: number, lineHeight = 17) {
  if (!text?.trim()) return emptyHeight;
  const lines = text.split("\n").length;
  const chars = text.length;
  const clampedLines = Math.min(MAX_TEXT_PREVIEW_LINES, Math.max(2, lines));
  const charBoost = chars > 4_000 ? 80 : chars > 1_500 ? 40 : 0;
  return Math.min(
    MAX_TEXT_PREVIEW_HEIGHT,
    Math.max(emptyHeight, clampedLines * lineHeight + 20 + charBoost),
  );
}

function getNodeBodyHeight(node: StudioNode) {
  const contentWidth = node.width - NODE_BODY_PADDING;

  if (node.type === "image" || node.type === "video") {
    return getMediaPreviewHeight(node, contentWidth);
  }

  if (node.type === "prompt") {
    const prompt = node.data.prompt?.trim() ?? "";
    const generated = (node.data.output || node.data.scriptText || "").trim();
    const generatedText = generated
      ? studioNodeDisplayText({ type: "prompt", data: { output: generated } })
      : "";
    const hasGenerated = Boolean(generatedText && generatedText !== prompt);
    const previewText = hasGenerated ? generatedText : studioNodeDisplayText(node);
    let previewHeight = Math.max(80, textBlockHeight(previewText, 48));
    if (hasGenerated && prompt) {
      previewHeight += 36;
    }
    return previewHeight;
  }

  if (node.type === "character") {
    const output = studioNodeDisplayText(node);
    let height = 72;
    if (output) height += textBlockHeight(output, 40, 16);
    return Math.max(80, height);
  }

  if (node.type === "audio") return node.data.audioUrl ? 96 : 72;
  return 72;
}

export function getRenderedNodeHeight(node: StudioNode) {
  return NODE_BODY_PADDING + getNodeBodyHeight(node) + NODE_PROMPT_BAR_HEIGHT;
}

export function getNodeHeight(node: StudioNode) {
  return Math.max(getRenderedNodeHeight(node), nodeMeta[node.type].height);
}

export function normalizeStudioNode(node: StudioNode, index = 0) {
  return {
    ...node,
    zIndex: typeof node.zIndex === "number" ? node.zIndex : index,
    height: getRenderedNodeHeight(node),
  };
}

export function sortNodesByZIndex(nodes: StudioNode[]) {
  return [...nodes].sort((a, b) => a.zIndex - b.zIndex);
}

export function bringNodeForward(nodes: StudioNode[], nodeId: string) {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target) return nodes;

  const nodeInFront = nodes
    .filter((node) => node.id !== nodeId && nodesOverlap(target, node) && node.zIndex > target.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex)[0];

  if (!nodeInFront) return nodes;

  const targetZ = target.zIndex;
  const frontZ = nodeInFront.zIndex;

  return nodes.map((node) => {
    if (node.id === target.id) return { ...node, zIndex: frontZ };
    if (node.id === nodeInFront.id) return { ...node, zIndex: targetZ };
    return node;
  });
}

export function sendNodeBackward(nodes: StudioNode[], nodeId: string) {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target) return nodes;

  const nodeBehind = nodes
    .filter((node) => node.id !== nodeId && nodesOverlap(target, node) && node.zIndex < target.zIndex)
    .sort((a, b) => b.zIndex - a.zIndex)[0];

  if (!nodeBehind) return nodes;

  const targetZ = target.zIndex;
  const behindZ = nodeBehind.zIndex;

  return nodes.map((node) => {
    if (node.id === target.id) return { ...node, zIndex: behindZ };
    if (node.id === nodeBehind.id) return { ...node, zIndex: targetZ };
    return node;
  });
}

export function canBringNodeForward(nodes: StudioNode[], nodeId: string) {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target) return false;
  return nodes.some((node) => node.id !== nodeId && nodesOverlap(target, node) && node.zIndex > target.zIndex);
}

export function canSendNodeBackward(nodes: StudioNode[], nodeId: string) {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target) return false;
  return nodes.some((node) => node.id !== nodeId && nodesOverlap(target, node) && node.zIndex < target.zIndex);
}

export function getNextNodeZIndex(nodes: StudioNode[]) {
  if (nodes.length === 0) return 0;
  return Math.max(...nodes.map((node) => node.zIndex ?? 0)) + 1;
}

export type StudioViewportBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function fitsInViewportBounds(
  x: number,
  y: number,
  node: StudioNode,
  nodeHeight: number,
  bounds?: StudioViewportBounds,
) {
  if (!bounds) return true;
  return (
    x >= bounds.minX &&
    y >= bounds.minY &&
    x + node.width <= bounds.maxX &&
    y + nodeHeight <= bounds.maxY
  );
}

export function findNodePlacement(
  nodes: StudioNode[],
  newNode: StudioNode,
  anchor?: { x: number; y: number },
  bounds?: StudioViewportBounds,
) {
  const nodeHeight = getRenderedNodeHeight(newNode);
  const stepX = snapToGrid(newNode.width + 32);
  const stepY = snapToGrid(nodeHeight + 32);
  const anchorX = snapToGrid(anchor?.x ?? 240);
  const anchorY = snapToGrid(anchor?.y ?? 120);

  const candidates: { x: number; y: number }[] = [{ x: anchorX, y: anchorY }];

  for (let ring = 1; ring <= 10; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        candidates.push({
          x: anchorX + dx * stepX,
          y: anchorY + dy * stepY,
        });
      }
    }
  }

  for (const { x, y } of candidates) {
    if (!fitsInViewportBounds(x, y, newNode, nodeHeight, bounds)) continue;

    const candidate = { ...newNode, x, y, height: nodeHeight };
    const collides = nodes.some((node) => nodesOverlap(candidate, node, 16));
    if (!collides) {
      return { x, y };
    }
  }

  if (nodes.length > 0) {
    const bottomMost = nodes.reduce((best, node) =>
      node.y + getNodeHeight(node) > best.y + getNodeHeight(best) ? node : best,
    );
    const fallbackY = snapToGrid(bottomMost.y + getNodeHeight(bottomMost) + 32);
    const fallbackX = snapToGrid(
      Math.min(
        Math.max(anchorX, bounds?.minX ?? anchorX),
        (bounds?.maxX ?? anchorX + newNode.width) - newNode.width,
      ),
    );

    if (fitsInViewportBounds(fallbackX, fallbackY, newNode, nodeHeight, bounds)) {
      return { x: fallbackX, y: fallbackY };
    }
  }

  return { x: anchorX, y: anchorY };
}

function snapToGrid(value: number) {
  const grid = 12;
  return Math.round(value / grid) * grid;
}
