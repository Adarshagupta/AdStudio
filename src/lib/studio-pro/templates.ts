import { createNode, type StudioEdge, type StudioNode, type StudioNodeData, type StudioNodeType } from "@/lib/studio-pro/types";

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
    title?: string;
    data?: Partial<StudioNodeData>;
  }>;
  edgeSpecs: Array<{ source: string; target: string }>;
};

export const studioTemplates: StudioTemplate[] = [
  {
    id: "multi-clip",
    name: "Multi-Clip Ad",
    description: "Consistent segments you export as one long-form video.",
    accent: "from-purple-500/30 to-purple-500/5",
    nodeSpecs: [
      {
        key: "character",
        type: "character",
        x: 60,
        y: 200,
        title: "Character",
        data: {
          prompt:
            "Full look & voice bible: age, wardrobe, hair, skin, energy, speaking style. Keep identical in every clip.",
        },
      },
      {
        key: "prompt",
        type: "prompt",
        x: 60,
        y: 520,
        title: "Campaign script",
        data: {
          prompt: "Full script or campaign brief. Long copy is fine — context is compressed smartly at run time.",
        },
      },
      {
        key: "image",
        type: "image",
        x: 400,
        y: 200,
        title: "Hero frame",
        data: {
          prompt: "Hero frame: subject, product, lighting, setting. Locks visual consistency for all video segments.",
        },
      },
      {
        key: "video1",
        type: "video",
        x: 780,
        y: 140,
        title: "Segment 1",
        data: {
          prompt: "Segment 1 — opening hook, scene, and spoken lines for THIS clip only.",
        },
      },
      {
        key: "video2",
        type: "video",
        x: 1140,
        y: 140,
        title: "Segment 2",
        data: {
          prompt: "Segment 2 — continue from segment 1. Match end-state; same talent, wardrobe, and lighting.",
        },
      },
    ],
    edgeSpecs: [
      { source: "character", target: "image" },
      { source: "prompt", target: "image" },
      { source: "image", target: "video1" },
      { source: "character", target: "video1" },
      { source: "prompt", target: "video1" },
      { source: "video1", target: "video2" },
      { source: "character", target: "video2" },
      { source: "prompt", target: "video2" },
    ],
  },
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
      title: spec.title,
      data: spec.data,
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
