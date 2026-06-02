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
    subtitle: "Llama 3.1",
    width: 280,
    height: 132,
    color: "from-violet-500/20 to-violet-500/5",
  },
  character: {
    title: "Character",
    subtitle: "Llama 3.1",
    width: 280,
    height: 168,
    color: "from-pink-500/20 to-pink-500/5",
  },
  image: {
    title: "Image Gen",
    subtitle: "Stable Diffusion XL",
    width: 300,
    height: 120,
    color: "from-sky-500/20 to-sky-500/5",
  },
  audio: {
    title: "Audio Gen",
    subtitle: "MeloTTS",
    width: 280,
    height: 196,
    color: "from-amber-500/20 to-amber-500/5",
  },
  video: {
    title: "Video Gen",
    subtitle: "Requires credits",
    width: 300,
    height: 120,
    color: "from-emerald-500/20 to-emerald-500/5",
  },
};

export function createNode(type: StudioNodeType, x: number, y: number, partial?: Partial<StudioNode>): StudioNode {
  const meta = nodeMeta[type];
  const node: StudioNode = {
    id: partial?.id ?? `${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    x,
    y,
    width: meta.width,
    height: meta.height,
    title: meta.title,
    subtitle: meta.subtitle,
    zIndex: 0,
    data: {
      model:
        type === "prompt" || type === "character"
          ? "@cf/meta/llama-3.1-8b-instruct"
          : type === "image"
            ? "@cf/stabilityai/stable-diffusion-xl-base-1.0"
            : type === "video"
              ? ""
              : type === "audio"
                ? "@cf/myshell-ai/melotts"
                : "custom",
      aspectRatio: "9:16",
      resolution: "1K",
      outputFormat: "png",
      prompt: "",
      characterName: "",
      voiceStyle: "",
      audioTitle: "",
      status: "idle",
      ...partial?.data,
    },
    ...partial,
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

const NODE_HEADER_HEIGHT = 52;
const NODE_BODY_PADDING = 24;
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

function getNodeBodyHeight(node: StudioNode) {
  const contentWidth = node.width - NODE_BODY_PADDING;

  if (node.type === "image" || node.type === "video") {
    return getMediaPreviewHeight(node, contentWidth);
  }
  if (node.type === "prompt") return 72;
  if (node.type === "character") return node.data.output ? 140 : 88;
  if (node.type === "audio") return node.data.audioUrl ? 120 : 88;
  return 80;
}

export function getRenderedNodeHeight(node: StudioNode) {
  return NODE_HEADER_HEIGHT + NODE_BODY_PADDING + getNodeBodyHeight(node);
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

export function findNodePlacement(nodes: StudioNode[], newNode: StudioNode) {
  const stepX = snapToGrid(newNode.width + 48);
  const stepY = snapToGrid(getRenderedNodeHeight(newNode) + 40);

  let x = snapToGrid(240);
  let y = snapToGrid(120);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = { ...newNode, x, y, height: getRenderedNodeHeight(newNode) };
    const collides = nodes.some((node) => nodesOverlap(candidate, node, 20));

    if (!collides) {
      return { x, y };
    }

    x += stepX;
    if (x + newNode.width > 1320) {
      x = snapToGrid(240);
      y += stepY;
    }
  }

  const bottomMost = nodes.reduce((best, node) =>
    node.y + getNodeHeight(node) > best.y + getNodeHeight(best) ? node : best,
  );

  return {
    x: snapToGrid(240),
    y: snapToGrid(bottomMost.y + getNodeHeight(bottomMost) + 48),
  };
}

function snapToGrid(value: number) {
  const grid = 12;
  return Math.round(value / grid) * grid;
}
