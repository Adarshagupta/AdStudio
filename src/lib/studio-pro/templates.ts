import { createNode, type StudioEdge, type StudioNode, type StudioNodeType } from "@/lib/studio-pro/types";

export type StudioTemplate = {
  id: string;
  name: string;
  description: string;
  accent: string;
  nodeSpecs: Array<{
    key: string;
    type: StudioNodeType;
    x: number;
    y: number;
  }>;
  edgeSpecs: Array<{ source: string; target: string }>;
};

export const studioTemplates: StudioTemplate[] = [
  {
    id: "ugc-video",
    name: "UGC Video",
    description: "Script, character, and final vertical video.",
    accent: "from-violet-500/30 to-violet-500/5",
    nodeSpecs: [
      { key: "prompt", type: "prompt", x: 80, y: 120 },
      { key: "character", type: "character", x: 80, y: 380 },
      { key: "video", type: "video", x: 480, y: 240 },
    ],
    edgeSpecs: [
      { source: "prompt", target: "video" },
      { source: "character", target: "video" },
    ],
  },
  {
    id: "image-ad",
    name: "Image Ad",
    description: "Brief to image, then animate into video.",
    accent: "from-sky-500/30 to-sky-500/5",
    nodeSpecs: [
      { key: "prompt", type: "prompt", x: 80, y: 180 },
      { key: "image", type: "image", x: 420, y: 120 },
      { key: "video", type: "video", x: 820, y: 200 },
    ],
    edgeSpecs: [
      { source: "prompt", target: "image" },
      { source: "image", target: "video" },
    ],
  },
  {
    id: "full-campaign",
    name: "Full Campaign",
    description: "Text, character, audio, image, and video pipeline.",
    accent: "from-emerald-500/30 to-emerald-500/5",
    nodeSpecs: [
      { key: "prompt", type: "prompt", x: 60, y: 320 },
      { key: "character", type: "character", x: 60, y: 560 },
      { key: "audio", type: "audio", x: 60, y: 80 },
      { key: "image", type: "image", x: 400, y: 180 },
      { key: "video", type: "video", x: 780, y: 280 },
    ],
    edgeSpecs: [
      { source: "audio", target: "image" },
      { source: "prompt", target: "image" },
      { source: "character", target: "image" },
      { source: "image", target: "video" },
    ],
  },
  {
    id: "script-first",
    name: "Script First",
    description: "Start with a text node, expand as you go.",
    accent: "from-amber-500/30 to-amber-500/5",
    nodeSpecs: [{ key: "prompt", type: "prompt", x: 320, y: 220 }],
    edgeSpecs: [],
  },
];

export function buildTemplateFlow(template: StudioTemplate): { nodes: StudioNode[]; edges: StudioEdge[] } {
  const idMap = new Map<string, string>();

  const nodes = template.nodeSpecs.map((spec, index) => {
    const node = createNode(spec.type, spec.x, spec.y, {
      id: `${spec.key}-${crypto.randomUUID().slice(0, 8)}`,
      zIndex: index,
    });
    idMap.set(spec.key, node.id);
    return node;
  });

  const edges: StudioEdge[] = template.edgeSpecs.map((spec) => {
    const source = idMap.get(spec.source)!;
    const target = idMap.get(spec.target)!;
    return { id: `e-${source}-${target}`, source, target };
  });

  return { nodes, edges };
}
