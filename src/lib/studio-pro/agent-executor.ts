import { buildNodeRunToolResult, type AgentToolExecutionResult } from "@/lib/studio-pro/agent-tool-result";
import type { StudioAgentCollabContext } from "@/lib/studio-pro/agent-collab";
import { teammateBlocksNode } from "@/lib/studio-pro/agent-collab";
import { reviewStudioFlow } from "@/lib/studio-pro/agent-critique";
import { organizeCanvas } from "@/lib/studio-pro/agent-layout";
import { applyRememberFlow, type StudioAgentFlowMemory } from "@/lib/studio-pro/agent-memory";
import type { AgentCanvasSnapshot } from "@/lib/studio-pro/agent-undo";
import {
  formatConnectedSocialAccounts,
  formatPublishOutcomes,
  resolvePublishToolPayload,
} from "@/lib/studio-pro/agent-social";
import type { AgentToolCall, AgentToolName } from "@/lib/studio-pro/agent-tools";
import type { SocialProviderId } from "@/lib/integrations/types";
import { explainConnectFailure, getIncomingEdges } from "@/lib/studio-pro/graph";
import type { StudioTemplate } from "@/lib/studio-pro/templates";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";
import {
  createNode,
  findNodePlacement,
  getNextNodeZIndex,
  getRenderedNodeHeight,
  type StudioEdge,
  type StudioNode,
  type StudioNodeType,
} from "@/lib/studio-pro/types";

export type StudioAgentActions = {
  getState: () => { nodes: StudioNode[]; edges: StudioEdge[] };
  addNode: (node: StudioNode) => void;
  updateNodeData: (nodeId: string, data: Partial<StudioNode["data"]>) => void;
  connectNodes: (sourceId: string, targetId: string) => boolean;
  disconnectNode: (targetId: string, direction?: "incoming" | "outgoing" | "all") => void;
  deleteNode: (nodeId: string) => void;
  applyTemplate: (template: StudioTemplate) => void | Promise<void>;
  runNode: (nodeId: string) => Promise<StudioNode | null>;
  runAll: () => Promise<void>;
  exportLongFormVideo: (options?: { title?: string }) => Promise<{
    jobId: string;
    status: string;
    finalVideoUrl?: string | null;
  }>;
  selectNode: (nodeId: string | null) => void;
  focusNode: (nodeId: string) => void;
  setFlowLayout: (nodes: StudioNode[], edges: StudioEdge[]) => void;
  viewportCenter: () => { x: number; y: number };
  flushSave: () => Promise<unknown>;
  listAssets: (kind?: UserMediaAssetDto["kind"], limit?: number) => Promise<UserMediaAssetDto[]>;
  attachAssetToNode: (nodeId: string, asset: UserMediaAssetDto) => void;
  restoreCanvasSnapshot: (snapshot: AgentCanvasSnapshot) => void;
  popUndoSnapshot: () => AgentCanvasSnapshot | null;
  getCollabContext: () => StudioAgentCollabContext;
  getFlowMemory: () => StudioAgentFlowMemory;
  setFlowMemory: (memory: StudioAgentFlowMemory) => void;
};

const GRID_SIZE = 12;
const DESTRUCTIVE_TOOLS = new Set<AgentToolName>([
  "update_node",
  "disconnect_node",
  "delete_node",
  "organize_canvas",
  "iterate_node",
  "attach_asset",
  "create_variants",
]);

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function patchFromArgs(args: Record<string, unknown>): Partial<StudioNode["data"]> {
  const patch: Partial<StudioNode["data"]> = {};
  if (typeof args.prompt === "string") patch.prompt = args.prompt;
  if (typeof args.characterName === "string") patch.characterName = args.characterName;
  if (typeof args.model === "string") patch.model = args.model;
  if (typeof args.aspectRatio === "string") patch.aspectRatio = args.aspectRatio;
  if (typeof args.resolution === "string") patch.resolution = args.resolution;
  if (typeof args.duration === "number") patch.duration = args.duration;
  if (
    args.videoOperation === "auto" ||
    args.videoOperation === "edit" ||
    args.videoOperation === "extend" ||
    args.videoOperation === "control"
  ) {
    patch.videoOperation = args.videoOperation;
  }
  return patch;
}

function guardTeammateOnNode(
  actions: StudioAgentActions,
  nodeId: string,
  toolName: AgentToolName,
) {
  if (!DESTRUCTIVE_TOOLS.has(toolName)) return null;
  const blocker = teammateBlocksNode(actions.getCollabContext(), nodeId);
  if (!blocker) return null;
  return {
    ok: false as const,
    message: `${blocker} is viewing ${nodeId} — wait or ask them before changing it.`,
  };
}

function assetPatchForNode(node: StudioNode, asset: UserMediaAssetDto): Partial<StudioNode["data"]> {
  if (asset.kind === "image" && (node.type === "image" || node.type === "video")) {
    return {
      imageUrl: asset.url,
      output: asset.url,
      imageWidth: asset.width ?? undefined,
      imageHeight: asset.height ?? undefined,
      mediaSource: asset.source === "uploaded" ? "upload" : "generated",
      status: "done",
      error: undefined,
    };
  }

  if (asset.kind === "video" && node.type === "video") {
    return {
      videoUrl: asset.url,
      output: asset.url,
      videoWidth: asset.width ?? undefined,
      videoHeight: asset.height ?? undefined,
      mediaSource: asset.source === "uploaded" ? "upload" : "generated",
      status: "done",
      error: undefined,
    };
  }

  if (asset.kind === "audio" && node.type === "audio") {
    return {
      audioUrl: asset.url,
      output: asset.url,
      mediaSource: asset.source === "uploaded" ? "upload" : "generated",
      status: "done",
      error: undefined,
    };
  }

  return {};
}

function compactBrief(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildSegmentPrompt(input: {
  brief: string;
  productName?: string;
  platform?: string;
  tone?: string;
  index: number;
  count: number;
}) {
  const label =
    input.index === 0
      ? "opening hook"
      : input.index === input.count - 1
        ? "closing proof and CTA"
        : `proof point ${input.index}`;
  return [
    `Segment ${input.index + 1} of ${input.count} — ${label}.`,
    input.productName ? `Product: ${input.productName}.` : null,
    input.platform ? `Platform: ${input.platform}.` : null,
    input.tone ? `Tone: ${input.tone}.` : null,
    `Use this brief: ${input.brief}`,
    "Write only shot notes and spoken lines for this segment. Keep continuity with adjacent segments.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMultiClipAdFlow(
  args: Record<string, unknown>,
  existingNodes: StudioNode[],
  existingEdges: StudioEdge[],
  actions: StudioAgentActions,
) {
  const brief = compactBrief(args.brief);
  const segmentCount =
    typeof args.segmentCount === "number" ? Math.min(8, Math.max(2, Math.round(args.segmentCount))) : 3;
  const platform = compactBrief(args.platform);
  const productName = compactBrief(args.productName);
  const tone = compactBrief(args.tone);
  const memory = actions.getFlowMemory();
  const aspectRatio =
    compactBrief(args.aspectRatio) || memory.preferences.aspectRatio || "9:16";
  const duration =
    typeof args.duration === "number" ? Math.min(20, Math.max(2, Math.round(args.duration))) : 8;
  const center = actions.viewportCenter();
  const startX = snapToGrid(center.x - 680);
  const startY = snapToGrid(center.y - 180);
  const zStart = getNextNodeZIndex(existingNodes);
  const newNodes: StudioNode[] = [];

  const add = (
    type: StudioNodeType,
    x: number,
    y: number,
    title: string,
    data: Partial<StudioNode["data"]>,
  ) => {
    const node = createNode(type, x, y, {
      title,
      zIndex: zStart + newNodes.length,
      data,
    });
    newNodes.push(node);
    return node;
  };

  const briefLines = [
    productName ? `Product: ${productName}` : null,
    platform ? `Platform: ${platform}` : null,
    tone ? `Tone: ${tone}` : null,
    brief,
  ]
    .filter(Boolean)
    .join("\n");

  const character = add("character", startX, startY, "Character bible", {
    prompt: [
      "Create a reusable on-camera talent bible for all segments.",
      "Include age range, wardrobe, hair, skin, delivery style, energy, product handling, lighting, and continuity rules.",
      briefLines,
    ].join("\n"),
    aspectRatio,
  });
  const script = add("prompt", startX, startY + 300, "Campaign script", {
    prompt: [
      `Write a ${segmentCount}-segment ad script with a strong hook, proof, objection handling, and CTA.`,
      "Keep each segment concise enough for generated video. Label segment lines clearly.",
      briefLines,
    ].join("\n"),
    aspectRatio,
  });
  const image = add("image", startX + 380, startY, "Hero frame", {
    prompt: [
      "Photorealistic hero frame that locks continuity for every video segment.",
      "Show the same talent, wardrobe, product, set, lighting, and composition style.",
      briefLines,
    ].join("\n"),
    aspectRatio,
  });
  const videos = Array.from({ length: segmentCount }, (_, index) =>
    add("video", startX + 760 + index * 360, startY + 40, `Segment ${index + 1}`, {
      prompt: buildSegmentPrompt({ brief, productName, platform, tone, index, count: segmentCount }),
      aspectRatio,
      duration,
      videoOperation: index === 0 ? "auto" : "extend",
    }),
  );

  const newEdges: StudioEdge[] = [
    { id: `e-${character.id}-${image.id}`, source: character.id, target: image.id },
    { id: `e-${script.id}-${image.id}`, source: script.id, target: image.id },
  ];

  for (let index = 0; index < videos.length; index += 1) {
    const video = videos[index]!;
    if (index === 0) {
      newEdges.push({ id: `e-${image.id}-${video.id}`, source: image.id, target: video.id });
    } else {
      const previous = videos[index - 1]!;
      newEdges.push({ id: `e-${previous.id}-${video.id}`, source: previous.id, target: video.id });
    }
    newEdges.push({ id: `e-${character.id}-${video.id}`, source: character.id, target: video.id });
    newEdges.push({ id: `e-${script.id}-${video.id}`, source: script.id, target: video.id });
  }

  return {
    nodes: [...existingNodes, ...newNodes],
    edges: [...existingEdges, ...newEdges],
    createdNodeIds: newNodes.map((node) => node.id),
    segmentCount,
  };
}

export async function executeAgentTool(
  call: AgentToolCall,
  actions: StudioAgentActions,
): Promise<AgentToolExecutionResult> {
  const { nodes } = actions.getState();

  try {
    switch (call.name as AgentToolName) {
      case "add_node": {
        const type = call.arguments.type as StudioNodeType;
        const memory = actions.getFlowMemory();
        const draft = createNode(type, 0, 0);
        const center = actions.viewportCenter();
        const anchor = {
          x: snapToGrid(center.x - draft.width / 2),
          y: snapToGrid(center.y - getRenderedNodeHeight(draft) / 2),
        };
        const { x, y } = findNodePlacement(nodes, draft, anchor);
        const memoryPatch = patchFromArgs(call.arguments);
        if (!memoryPatch.aspectRatio && memory.preferences.aspectRatio) {
          memoryPatch.aspectRatio = memory.preferences.aspectRatio;
        }
        const node = createNode(type, x, y, {
          zIndex: getNextNodeZIndex(nodes),
          data: memoryPatch,
        });
        actions.addNode(node);
        actions.selectNode(node.id);
        await actions.flushSave();
        const prompt =
          typeof call.arguments.prompt === "string" ? call.arguments.prompt.trim() : undefined;
        return {
          ok: true,
          message: prompt
            ? `Added ${type} node ${node.id} with your brief.`
            : `Added ${type} node ${node.id}.`,
          outputText: prompt,
          nodeId: node.id,
        };
      }

      case "update_node": {
        const nodeId = String(call.arguments.nodeId);
        const blocked = guardTeammateOnNode(actions, nodeId, call.name);
        if (blocked) return blocked;
        if (!nodes.some((node) => node.id === nodeId)) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        const patch = patchFromArgs(call.arguments);
        if (Object.keys(patch).length === 0) {
          return { ok: false, message: `No fields to update on ${nodeId}.` };
        }
        actions.updateNodeData(nodeId, patch);
        actions.selectNode(nodeId);
        await actions.flushSave();
        return { ok: true, message: `Updated node ${nodeId}.` };
      }

      case "connect_nodes": {
        const sourceId = String(call.arguments.sourceId);
        const targetId = String(call.arguments.targetId);
        const { edges } = actions.getState();
        if (!nodes.some((node) => node.id === sourceId)) {
          return { ok: false, message: `Source node ${sourceId} not found.` };
        }
        if (!nodes.some((node) => node.id === targetId)) {
          return { ok: false, message: `Target node ${targetId} not found.` };
        }
        if (explainConnectFailure(sourceId, targetId, edges) === "already connected") {
          return { ok: true, message: `${sourceId} → ${targetId} is already connected.` };
        }
        const created = actions.connectNodes(sourceId, targetId);
        if (!created) {
          return {
            ok: false,
            message: `Could not connect ${sourceId} → ${targetId}: ${explainConnectFailure(sourceId, targetId, actions.getState().edges)}.`,
          };
        }
        await actions.flushSave();
        return { ok: true, message: `Connected ${sourceId} → ${targetId}.` };
      }

      case "disconnect_node": {
        const targetId = String(call.arguments.targetId);
        const blocked = guardTeammateOnNode(actions, targetId, call.name);
        if (blocked) return blocked;
        const direction =
          call.arguments.direction === "outgoing" ||
          call.arguments.direction === "all" ||
          call.arguments.direction === "incoming"
            ? call.arguments.direction
            : "incoming";
        if (!nodes.some((node) => node.id === targetId)) {
          return { ok: false, message: `Node ${targetId} not found.` };
        }
        actions.disconnectNode(targetId, direction);
        await actions.flushSave();
        const label =
          direction === "all"
            ? "all edges on"
            : direction === "outgoing"
              ? "outgoing edges from"
              : "incoming edges on";
        return { ok: true, message: `Disconnected ${label} ${targetId}.` };
      }

      case "delete_node": {
        const nodeId = String(call.arguments.nodeId);
        const blocked = guardTeammateOnNode(actions, nodeId, call.name);
        if (blocked) return blocked;
        if (!nodes.some((node) => node.id === nodeId)) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        actions.deleteNode(nodeId);
        await actions.flushSave();
        return { ok: true, message: `Deleted node ${nodeId}.` };
      }

      case "apply_template": {
        const templateId = String(call.arguments.templateId);
        const { studioTemplates } = await import("@/lib/studio-pro/templates");
        const template = studioTemplates.find((item) => item.id === templateId);
        if (!template) {
          return { ok: false, message: `Template ${templateId} not found.` };
        }
        await actions.applyTemplate(template);
        return { ok: true, message: `Applied template "${template.name}".` };
      }

      case "build_multi_clip_ad": {
        const brief = compactBrief(call.arguments.brief);
        if (brief.length < 10) {
          return { ok: false, message: "Pass a campaign brief of at least 10 characters." };
        }
        const { nodes: currentNodes, edges: currentEdges } = actions.getState();
        const result = buildMultiClipAdFlow(call.arguments, currentNodes, currentEdges, actions);
        actions.setFlowLayout(result.nodes, result.edges);
        const lastNodeId = result.createdNodeIds.at(-1) ?? null;
        if (lastNodeId) actions.focusNode(lastNodeId);
        await actions.flushSave();
        return {
          ok: true,
          message: `Built a ${result.segmentCount}-segment long-form ad flow with ${result.createdNodeIds.length} nodes.`,
          outputText: `Created nodes: ${result.createdNodeIds.join(", ")}`,
          nodeId: lastNodeId ?? undefined,
        };
      }

      case "run_node": {
        const nodeId = String(call.arguments.nodeId);
        const existing = nodes.find((node) => node.id === nodeId);
        if (!existing) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        if (existing.data.status === "running") {
          actions.updateNodeData(nodeId, { status: "idle", error: undefined });
        }
        const completed = await actions.runNode(nodeId);
        if (!completed) {
          return { ok: false, message: `Node ${nodeId} not found after run.` };
        }
        if (completed.data.status === "failed") {
          return { ok: false, message: `Node ${nodeId} failed: ${completed.data.error ?? "unknown error"}` };
        }
        return buildNodeRunToolResult(completed);
      }

      case "run_all": {
        if (nodes.length === 0) {
          return { ok: false, message: "Canvas is empty — add nodes first." };
        }
        await actions.runAll();
        const failed = actions.getState().nodes.filter((node) => node.data.status === "failed");
        if (failed.length > 0) {
          return {
            ok: false,
            message: `Run all finished with ${failed.length} failed node(s): ${failed.map((n) => n.id).join(", ")}`,
          };
        }
        return { ok: true, message: "Ran all nodes successfully." };
      }

      case "export_long_form": {
        const title = typeof call.arguments.title === "string" ? call.arguments.title : undefined;
        const result = await actions.exportLongFormVideo({ title });
        if (result.status === "FAILED") {
          return { ok: false, message: "Long-form export failed." };
        }
        return {
          ok: true,
          message: result.finalVideoUrl
            ? "Exported the completed video segments as one long-form MP4."
            : "Started long-form export. It will finish in the background.",
          videoUrl: result.finalVideoUrl ?? undefined,
          outputText: `Export job: ${result.jobId}`,
        };
      }

      case "select_node": {
        const nodeId = String(call.arguments.nodeId);
        if (!nodes.some((node) => node.id === nodeId)) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        actions.focusNode(nodeId);
        const node = nodes.find((item) => item.id === nodeId);
        return {
          ok: true,
          message: `Focused ${node?.type ?? "node"} ${nodeId} on the canvas.`,
          nodeId,
        };
      }

      case "organize_canvas": {
        const blockedPeer = actions.getCollabContext().activeTeammates[0];
        if (blockedPeer && actions.getCollabContext().peerFocusNodes.length > 0) {
          return {
            ok: false,
            message: `Teammate ${blockedPeer.name} is on the canvas — confirm before reorganizing.`,
          };
        }
        const { nodes: currentNodes, edges: currentEdges } = actions.getState();
        if (currentNodes.length === 0) {
          return { ok: false, message: "Canvas is empty — nothing to organize." };
        }
        const rebuildEdges = call.arguments.rebuildEdges !== false;
        const result = organizeCanvas(currentNodes, currentEdges, { rebuildEdges });
        actions.setFlowLayout(result.nodes, result.edges);
        await actions.flushSave();
        return { ok: true, message: result.message };
      }

      case "iterate_node": {
        const nodeId = String(call.arguments.nodeId);
        const blocked = guardTeammateOnNode(actions, nodeId, call.name);
        if (blocked) return blocked;
        const existing = nodes.find((node) => node.id === nodeId);
        if (!existing) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        const patch = patchFromArgs(call.arguments);
        if (Object.keys(patch).length === 0) {
          return {
            ok: false,
            message: `Pass an updated prompt or setting for ${nodeId} before iterating.`,
          };
        }
        actions.updateNodeData(nodeId, patch);
        actions.focusNode(nodeId);
        await actions.flushSave();

        if (existing.data.status === "running") {
          actions.updateNodeData(nodeId, { status: "idle", error: undefined });
        }

        const completed = await actions.runNode(nodeId);
        if (!completed) {
          return { ok: false, message: `Node ${nodeId} not found after run.` };
        }
        if (completed.data.status === "failed") {
          return {
            ok: false,
            message: `Iteration failed on ${nodeId}: ${completed.data.error ?? "unknown error"}`,
          };
        }
        return buildNodeRunToolResult(completed);
      }

      case "list_assets": {
        const kind =
          call.arguments.kind === "image" ||
          call.arguments.kind === "audio" ||
          call.arguments.kind === "video"
            ? call.arguments.kind
            : undefined;
        const limit =
          typeof call.arguments.limit === "number"
            ? Math.min(Math.max(call.arguments.limit, 1), 1000)
            : 12;
        const assets = await actions.listAssets(kind, limit);
        if (assets.length === 0) {
          return { ok: true, message: "No assets found in your library.", outputText: "" };
        }
        const lines = assets.map(
          (asset) =>
            `${asset.id} · ${asset.kind} · ${asset.name ?? "Untitled"} · ${asset.source}`,
        );
        return {
          ok: true,
          message: `Found ${assets.length} asset(s).`,
          outputText: lines.join("\n"),
        };
      }

      case "attach_asset": {
        const nodeId = String(call.arguments.nodeId);
        const assetId = String(call.arguments.assetId);
        const blocked = guardTeammateOnNode(actions, nodeId, call.name);
        if (blocked) return blocked;
        const node = nodes.find((item) => item.id === nodeId);
        if (!node) {
          return { ok: false, message: `Node ${nodeId} not found.` };
        }
        const assets = await actions.listAssets(undefined, 48);
        const asset = assets.find((item) => item.id === assetId);
        if (!asset) {
          return { ok: false, message: `Asset ${assetId} not found. Call list_assets first.` };
        }
        const patch = assetPatchForNode(node, asset);
        if (Object.keys(patch).length === 0) {
          return {
            ok: false,
            message: `Asset kind ${asset.kind} does not match node type ${node.type}.`,
          };
        }
        actions.updateNodeData(nodeId, patch);
        actions.focusNode(nodeId);
        await actions.flushSave();
        return {
          ok: true,
          message: `Attached ${asset.kind} asset to ${nodeId}.`,
          nodeId,
          imageUrl: patch.imageUrl,
          videoUrl: patch.videoUrl,
          audioUrl: patch.audioUrl,
        };
      }

      case "undo_last_action": {
        const snapshot = actions.popUndoSnapshot();
        if (!snapshot) {
          return { ok: false, message: "Nothing to undo." };
        }
        actions.restoreCanvasSnapshot(snapshot);
        await actions.flushSave();
        return {
          ok: true,
          message: `Restored canvas from ${new Date(snapshot.savedAt).toLocaleTimeString()}.`,
        };
      }

      case "review_flow": {
        const { nodes: currentNodes, edges: currentEdges } = actions.getState();
        const review = reviewStudioFlow(currentNodes, currentEdges);
        return {
          ok: review.ok,
          message: review.message,
          outputText: review.outputText,
        };
      }

      case "create_variants": {
        const sourceId = String(call.arguments.nodeId);
        const blocked = guardTeammateOnNode(actions, sourceId, call.name);
        if (blocked) return blocked;
        const source = nodes.find((node) => node.id === sourceId);
        if (!source) {
          return { ok: false, message: `Node ${sourceId} not found.` };
        }
        if (source.type !== "prompt" && source.type !== "character") {
          return {
            ok: false,
            message: "Variants work on text or character nodes — pick a prompt/character node.",
          };
        }
        const variations = Array.isArray(call.arguments.variations)
          ? call.arguments.variations.filter((item): item is string => typeof item === "string")
          : [];
        if (variations.length < 2) {
          return { ok: false, message: "Pass 2-20 variation prompts." };
        }

        const { edges } = actions.getState();
        const incoming = getIncomingEdges(sourceId, edges);
        const outgoing = edges.filter((edge) => edge.source === sourceId);
        const createdIds: string[] = [];
        let workingNodes = [...nodes];

        for (const [index, variation] of Array.from(variations.slice(0, 20).entries())) {
          const draft = createNode(source.type, 0, 0);
          const anchor = {
            x: snapToGrid(source.x + (index - 1) * 40),
            y: snapToGrid(source.y + getRenderedNodeHeight(source) + 56 + index * 24),
          };
          const { x, y } = findNodePlacement(workingNodes, draft, anchor);
          const variant = createNode(source.type, x, y, {
            zIndex: getNextNodeZIndex(workingNodes),
            data: {
              ...source.data,
              prompt: variation,
              output: undefined,
              scriptText: undefined,
              status: "idle",
              error: undefined,
            },
          });
          actions.addNode(variant);
          workingNodes = [...workingNodes, variant];
          createdIds.push(variant.id);

          for (const edge of incoming) {
            actions.connectNodes(edge.source, variant.id);
          }
          for (const edge of outgoing) {
            actions.connectNodes(variant.id, edge.target);
          }
        }

        await actions.flushSave();
        return {
          ok: true,
          message: `Created ${createdIds.length} variants from ${sourceId}: ${createdIds.join(", ")}.`,
          outputText: variations.slice(0, 3).join("\n---\n"),
        };
      }

      case "list_connected_social": {
        const response = await fetch("/api/studio/social");
        if (!response.ok) {
          return { ok: false, message: "Could not load connected social accounts." };
        }
        const data = (await response.json()) as {
          accounts?: Array<{
            provider: SocialProviderId;
            username: string | null;
            displayName: string | null;
          }>;
        };
        const accounts = data.accounts ?? [];
        return {
          ok: true,
          message:
            accounts.length > 0
              ? `${accounts.length} social account(s) connected.`
              : "No social accounts connected yet.",
          outputText: formatConnectedSocialAccounts(accounts),
        };
      }

      case "publish_to_social": {
        const { nodes: currentNodes } = actions.getState();
        const payload = resolvePublishToolPayload(call.arguments, currentNodes);
        if (!payload.ok) {
          return { ok: false, message: payload.message };
        }
        if (payload.nodeId) {
          actions.focusNode(payload.nodeId);
        }

        const response = await fetch("/api/studio/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providers: payload.providers,
            mediaUrl: payload.mediaUrl,
            mediaType: payload.mediaType,
            caption: payload.caption,
            subreddit: payload.subreddit,
          }),
        });

        const data = (await response.json()) as {
          ok?: boolean;
          message?: string;
          outcomes?: Array<{ provider: string; ok: boolean; message: string; postUrl?: string }>;
          error?: string;
        };

        if (!response.ok) {
          return {
            ok: false,
            message: data.error ?? data.message ?? "Social publish failed.",
          };
        }

        const outcomes = data.outcomes ?? [];
        const succeeded = outcomes.filter((outcome) => outcome.ok).length;

        return {
          ok: Boolean(data.ok),
          message: data.message ?? `Published to ${succeeded} channel(s).`,
          outputText: formatPublishOutcomes(outcomes),
          videoUrl: payload.mediaType === "video" ? payload.mediaUrl : undefined,
          imageUrl: payload.mediaType === "image" ? payload.mediaUrl : undefined,
        };
      }

      case "remember_flow": {
        const current = actions.getFlowMemory();
        const next = applyRememberFlow(current, {
          key: typeof call.arguments.key === "string" ? call.arguments.key : undefined,
          value: typeof call.arguments.value === "string" ? call.arguments.value : undefined,
          note: typeof call.arguments.note === "string" ? call.arguments.note : undefined,
        });
        actions.setFlowMemory(next);
        await actions.flushSave();
        const parts = [];
        if (next.summary) parts.push(`note saved`);
        if (Object.keys(next.preferences).length) parts.push(`${Object.keys(next.preferences).length} preference(s)`);
        return {
          ok: true,
          message: `Flow memory updated (${parts.join(", ") || "saved"}).`,
          outputText: [
            next.summary ? `Summary: ${next.summary}` : "",
            ...Object.entries(next.preferences).map(([key, value]) => `${key}: ${value}`),
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

      default:
        return { ok: false, message: `Unknown tool: ${call.name}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    return { ok: false, message };
  }
}
