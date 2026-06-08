import { z } from "zod";

import { studioTemplates } from "@/lib/studio-pro/templates";
import type { StudioNodeType } from "@/lib/studio-pro/types";

export const STUDIO_NODE_TYPES = ["prompt", "character", "image", "audio", "video"] as const;

export type AgentToolName =
  | "add_node"
  | "update_node"
  | "connect_nodes"
  | "disconnect_node"
  | "delete_node"
  | "apply_template"
  | "build_multi_clip_ad"
  | "run_node"
  | "run_all"
  | "export_long_form"
  | "select_node"
  | "organize_canvas"
  | "iterate_node"
  | "list_assets"
  | "attach_asset"
  | "undo_last_action"
  | "review_flow"
  | "create_variants"
  | "remember_flow"
  | "list_connected_social"
  | "publish_to_social";

export const agentToolSchemas = {
  add_node: z.object({
    type: z.enum(STUDIO_NODE_TYPES),
    prompt: z.string().optional(),
    characterName: z.string().optional(),
    model: z.string().optional(),
    aspectRatio: z.string().optional(),
    resolution: z.string().optional(),
    duration: z.number().optional(),
    videoOperation: z.enum(["auto", "edit", "extend", "control"]).optional(),
  }),
  update_node: z.object({
    nodeId: z.string().min(1),
    prompt: z.string().optional(),
    characterName: z.string().optional(),
    model: z.string().optional(),
    aspectRatio: z.string().optional(),
    resolution: z.string().optional(),
    duration: z.number().optional(),
    videoOperation: z.enum(["auto", "edit", "extend", "control"]).optional(),
  }),
  connect_nodes: z.object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  disconnect_node: z.object({
    targetId: z.string().min(1),
    direction: z.enum(["incoming", "outgoing", "all"]).optional(),
  }),
  delete_node: z.object({
    nodeId: z.string().min(1),
  }),
  apply_template: z.object({
    templateId: z.enum(["multi-clip", "ugc-video", "image-ad", "full-campaign", "script-first"]),
  }),
  build_multi_clip_ad: z.object({
    brief: z.string().min(10).max(5000),
    segmentCount: z.number().int().min(2).max(8).optional(),
    platform: z.string().max(80).optional(),
    productName: z.string().max(120).optional(),
    tone: z.string().max(160).optional(),
    aspectRatio: z.string().max(16).optional(),
    duration: z.number().int().min(2).max(20).optional(),
  }),
  run_node: z.object({
    nodeId: z.string().min(1),
  }),
  run_all: z.object({}),
  export_long_form: z.object({
    title: z.string().max(120).optional(),
  }),
  select_node: z.object({
    nodeId: z.string().min(1),
  }),
  organize_canvas: z.object({
    rebuildEdges: z.boolean().optional(),
  }),
  iterate_node: z.object({
    nodeId: z.string().min(1),
    prompt: z.string().optional(),
    characterName: z.string().optional(),
    model: z.string().optional(),
    aspectRatio: z.string().optional(),
    resolution: z.string().optional(),
    duration: z.number().optional(),
    videoOperation: z.enum(["auto", "edit", "extend", "control"]).optional(),
  }),
  list_assets: z.object({
    kind: z.enum(["image", "audio", "video"]).optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  }),
  attach_asset: z.object({
    nodeId: z.string().min(1),
    assetId: z.string().min(1),
  }),
  undo_last_action: z.object({}),
  review_flow: z.object({
    focus: z.enum(["hook", "cta", "platform", "pipeline", "all"]).optional(),
  }),
  create_variants: z.object({
    nodeId: z.string().min(1),
    variations: z.array(z.string().min(1)).min(2).max(20),
  }),
  remember_flow: z.object({
    key: z.string().max(48).optional(),
    value: z.string().max(240).optional(),
    note: z.string().max(5000).optional(),
  }),
  list_connected_social: z.object({}),
  publish_to_social: z.object({
    providers: z
      .array(z.enum(["instagram", "tiktok", "facebook", "reddit"]))
      .optional(),
    nodeId: z.string().min(1).optional(),
    mediaUrl: z.string().url().optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    caption: z.string().max(2200).optional(),
    subreddit: z.string().max(80).optional(),
  }),
} satisfies Record<AgentToolName, z.ZodTypeAny>;

export type AgentToolCall = {
  id: string;
  name: AgentToolName;
  arguments: Record<string, unknown>;
};

export type AgentToolDefinition = {
  type: "function";
  function: {
    name: AgentToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const templateList = studioTemplates.map((t) => `${t.id}: ${t.name} — ${t.description}`).join("\n");

export const studioAgentTools: AgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "add_node",
      description:
        "Add a new node to the canvas. Types: prompt (text/script), character, image, audio, video. Set prompts and settings in the same call when possible.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...STUDIO_NODE_TYPES] },
          prompt: { type: "string", description: "Brief or script for text/image/audio/video nodes." },
          characterName: { type: "string", description: "Character name for character nodes." },
          model: { type: "string", description: "Optional model override." },
          aspectRatio: { type: "string", description: "e.g. 9:16, 16:9, 1:1" },
          resolution: { type: "string", description: "Video: 480p, 720p. Image: 1K." },
          duration: { type: "number", description: "Video duration in seconds." },
          videoOperation: { type: "string", enum: ["auto", "edit", "extend", "control"] },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_node",
      description: "Update an existing node's prompt, character name, or generation settings.",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          prompt: { type: "string" },
          characterName: { type: "string" },
          model: { type: "string" },
          aspectRatio: { type: "string" },
          resolution: { type: "string" },
          duration: { type: "number" },
          videoOperation: { type: "string", enum: ["auto", "edit", "extend", "control"] },
        },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "connect_nodes",
      description:
        "Connect output of source node to input of target. Typical: prompt/character/image/audio → image or video.",
      parameters: {
        type: "object",
        properties: {
          sourceId: { type: "string" },
          targetId: { type: "string" },
        },
        required: ["sourceId", "targetId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "disconnect_node",
      description:
        "Remove connections on a node. direction: incoming (default), outgoing, or all. Use all when restructuring the flow.",
      parameters: {
        type: "object",
        properties: {
          targetId: { type: "string" },
          direction: { type: "string", enum: ["incoming", "outgoing", "all"] },
        },
        required: ["targetId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description: "Delete a node and its connections.",
      parameters: {
        type: "object",
        properties: { nodeId: { type: "string" } },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_template",
      description: `Replace the canvas with a starter template. Available:\n${templateList}`,
      parameters: {
        type: "object",
        properties: {
          templateId: {
            type: "string",
            enum: ["multi-clip", "ugc-video", "image-ad", "full-campaign", "script-first"],
          },
        },
        required: ["templateId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_multi_clip_ad",
      description:
        "Build a complete long-form/multi-clip ad flow in one operation: character bible, campaign script, hero image, and chained video segments. Use this for long-form or multi-part video requests instead of adding nodes one by one.",
      parameters: {
        type: "object",
        properties: {
          brief: { type: "string", description: "The full campaign/product brief." },
          segmentCount: { type: "number", description: "Number of video segments, 2-8. Default 3." },
          platform: { type: "string", description: "Target platform, e.g. TikTok, Reels, YouTube Shorts." },
          productName: { type: "string", description: "Product or brand name." },
          tone: { type: "string", description: "Creative tone, e.g. premium, direct-response, funny." },
          aspectRatio: { type: "string", description: "Usually 9:16 or 16:9." },
          duration: { type: "number", description: "Duration per video segment in seconds." },
        },
        required: ["brief"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_node",
      description:
        "Execute a single node (generate script, character, image, audio, or video). Waits until complete.",
      parameters: {
        type: "object",
        properties: { nodeId: { type: "string" } },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_all",
      description:
        "Run all nodes in dependency order (topological sort). Use after the flow is wired. The user must approve before this runs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "export_long_form",
      description:
        "Export completed video nodes on the canvas as one long-form MP4. Requires at least two completed video nodes. User approval is required before exporting.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Optional export title." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select_node",
      description:
        "Select a node and pan the canvas to it. Use when pointing the user at a specific step or before editing a node.",
      parameters: {
        type: "object",
        properties: { nodeId: { type: "string" } },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "organize_canvas",
      description:
        "Clean up the canvas: layout nodes left-to-right and rebuild valid pipeline edges. Use after messy wiring or duplicate connections.",
      parameters: {
        type: "object",
        properties: {
          rebuildEdges: {
            type: "boolean",
            description: "When true (default), drop bad edges and rebuild a standard DAG. When false, only fix layout.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "iterate_node",
      description:
        "Update a node's brief or settings and immediately re-run it. Use for tweaks like 'make it punchier' or 'shorter hook'.",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          prompt: { type: "string" },
          characterName: { type: "string" },
          model: { type: "string" },
          aspectRatio: { type: "string" },
          resolution: { type: "string" },
          duration: { type: "number" },
          videoOperation: { type: "string", enum: ["auto", "edit", "extend", "control"] },
        },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_assets",
      description: "List the user's image, audio, or video assets from their library.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["image", "audio", "video"] },
          limit: { type: "number", description: "Max assets to return (default 12)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "attach_asset",
      description: "Attach a library asset to an image, audio, or video node by asset ID.",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          assetId: { type: "string" },
        },
        required: ["nodeId", "assetId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_last_action",
      description: "Revert the canvas to before the agent's last tool round.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "review_flow",
      description:
        "Critique the current flow for hook, CTA, platform fit, and pipeline readiness without changing the canvas.",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", enum: ["hook", "cta", "platform", "pipeline", "all"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_variants",
      description:
        "Create 2-3 variant nodes from a text or character node with different prompts. Copies upstream wiring.",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          variations: {
            type: "array",
            items: { type: "string" },
            description: "2-3 alternate prompts.",
          },
        },
        required: ["nodeId", "variations"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember_flow",
      description:
        "Save a preference or note for this flow (e.g. aspect ratio, tone, product focus). Persists across sessions.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Preference key, e.g. aspectRatio or product." },
          value: { type: "string", description: "Preference value." },
          note: { type: "string", description: "Short flow summary note." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_connected_social",
      description:
        "List social accounts connected to this workspace (Instagram, TikTok, Facebook, Reddit).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_to_social",
      description:
        "Publish a generated image or video to connected social channels. Omit providers to post to all connected accounts, or pass specific ones. Use nodeId to publish from a canvas image/video node. User approval is required before posting.",
      parameters: {
        type: "object",
        properties: {
          providers: {
            type: "array",
            items: { type: "string", enum: ["instagram", "tiktok", "facebook", "reddit"] },
            description: "Target platforms. Omit to publish to all connected accounts.",
          },
          nodeId: { type: "string", description: "Image or video node with generated media." },
          mediaUrl: { type: "string", description: "Public image or video URL." },
          mediaType: { type: "string", enum: ["image", "video"] },
          caption: { type: "string", description: "Post caption or Reddit title." },
          subreddit: { type: "string", description: "Required for Reddit if no default is saved." },
        },
      },
    },
  },
];

export function parseAgentToolCall(input: {
  id: string;
  name: string;
  arguments: string;
}): AgentToolCall | null {
  const name = input.name as AgentToolName;
  if (!(name in agentToolSchemas)) return null;

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(input.arguments || "{}") as Record<string, unknown>;
  } catch {
    return null;
  }

  const schema = agentToolSchemas[name];
  const parsed = schema.safeParse(args);
  if (!parsed.success) return null;

  return { id: input.id, name, arguments: parsed.data as Record<string, unknown> };
}

export function nodeTypeLabel(type: StudioNodeType) {
  const labels: Record<StudioNodeType, string> = {
    prompt: "Text",
    character: "Character",
    image: "Image",
    audio: "Audio",
    video: "Video",
  };
  return labels[type];
}
