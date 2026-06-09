"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StudioNodeContextMenu } from "@/components/studio-pro/StudioNodeContextMenu";
import { StudioConnectionLayer } from "@/components/studio-pro/StudioConnectionLayer";
import { StudioFloatingToolbar, type StudioCanvasTool } from "@/components/studio-pro/StudioFloatingToolbar";
import { StudioNodeCard } from "@/components/studio-pro/StudioNodeCard";
import { StudioProAgentPanel } from "@/components/studio-pro/StudioProAgentPanel";
import { StudioProHeader } from "@/components/studio-pro/StudioProHeader";
import { StudioProInspector } from "@/components/studio-pro/StudioProInspector";
import { StudioRemoteCursors } from "@/components/studio-pro/StudioRemoteCursors";
import { StudioMultiClipWorkflow } from "@/components/studio-pro/StudioMultiClipWorkflow";
import { PublishTemplateDialog } from "@/components/studio-pro/PublishTemplateDialog";
import { StudioTemplatePicker } from "@/components/studio-pro/StudioTemplatePicker";
import { useStudioCollaboration } from "@/hooks/useStudioCollaboration";
import { useStudioTheme } from "@/hooks/useStudioTheme";
import { useStudioFlowAutoSave, type StudioFlowPersistState } from "@/hooks/useStudioFlowAutoSave";
import { mergeRemoteStudioState } from "@/lib/studio-pro/merge-remote";
import { anyNodeVisible, fitViewportToNodes } from "@/lib/studio-pro/viewport";
import type { StudioSyncPayload } from "@/lib/studio-pro/realtime-types";
import type { StudioCollaborator } from "@/hooks/useStudioCollaboration";
import {
  buildVideoGenerationContext,
  findSnapTarget,
  getIncomingEdges,
  topologicalSort,
  wouldCreateCycle,
} from "@/lib/studio-pro/graph";
import type { StudioViewport } from "@/lib/studio-pro/flows";
import { notify } from "@/lib/notify";
import { registerStudioNodeMedia } from "@/lib/register-studio-node-media";
import { runStudioNode } from "@/lib/studio-pro/runner";
import type { StudioAgentChatSnapshot, StudioAgentChatSyncPayload } from "@/lib/studio-pro/agent-sessions";
import { buildCollabContext } from "@/lib/studio-pro/agent-collab";
import type { StudioAgentActions } from "@/lib/studio-pro/agent-executor";
import { createAgentRuntimeBridge } from "@/lib/studio-pro/agent-runtime-bridge";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";
import { saveStudioFlow } from "@/lib/studio-pro/flow-client";
import { buildTemplateFlow, type StudioTemplate } from "@/lib/studio-pro/templates";
import { cn } from "@/lib/utils";
import {
  bringNodeForward,
  canBringNodeForward,
  canSendNodeBackward,
  createNode,
  findNodePlacement,
  getNextNodeZIndex,
  getRenderedNodeHeight,
  normalizeStudioNode,
  sendNodeBackward,
  sortNodesByZIndex,
  type StudioEdge,
  type StudioNode,
  type StudioNodeType,
} from "@/lib/studio-pro/types";

const GRID_SIZE = 12;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const PAN_DRAG_THRESHOLD = 4;

type LongFormExportResponse = {
  error?: string;
  queued?: boolean;
  job?: {
    id: string;
    status: string;
    finalVideoUrl?: string | null;
    errorMessage?: string | null;
  };
};

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function dependencyBatches(nodes: StudioNode[], edges: StudioEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    incoming.set(node.id, new Set());
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    incoming.get(edge.target)?.add(edge.source);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ready = nodes.filter((node) => (incoming.get(node.id)?.size ?? 0) === 0).map((node) => node.id);
  const batches: StudioNode[][] = [];
  const visited = new Set<string>();

  while (ready.length > 0) {
    const batchIds = ready.splice(0, ready.length).filter((id) => !visited.has(id));
    if (batchIds.length === 0) continue;
    const batch = batchIds.map((id) => byId.get(id)).filter((node): node is StudioNode => Boolean(node));
    batches.push(batch);

    for (const id of batchIds) {
      visited.add(id);
      for (const targetId of outgoing.get(id) ?? []) {
        const dependencies = incoming.get(targetId);
        dependencies?.delete(id);
        if (dependencies && dependencies.size === 0 && !visited.has(targetId)) {
          ready.push(targetId);
        }
      }
    }
  }

  return visited.size === nodes.length ? batches : topologicalSort(nodes, edges).map((node) => [node]);
}

function isCanvasBackgroundTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[data-studio-canvas-bg]"));
}

function isStudioOverlayTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "[data-studio-node], [data-studio-overlay], .studio-inspector, .studio-agent, .studio-flows-toolbar",
    ),
  );
}

function canvasPointFromEvent(
  event: { clientX: number; clientY: number },
  canvas: HTMLElement,
  zoom: number,
  pan: { x: number; y: number },
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - pan.x) / zoom,
    y: (event.clientY - rect.top - pan.y) / zoom,
  };
}

export function StudioProWorkspace({
  sessionId,
  flowName,
  initialNodes,
  initialEdges,
  initialViewport,
  initialAgentChat,
  initialUpdatedAt,
  showTemplatePickerOnLoad = false,
  collaborator,
  workspaceId,
  creditsRemaining,
}: {
  sessionId: string;
  flowName: string;
  initialNodes: StudioNode[];
  initialEdges: StudioEdge[];
  initialViewport: StudioViewport;
  initialAgentChat: StudioAgentChatSnapshot;
  initialUpdatedAt?: string;
  showTemplatePickerOnLoad?: boolean;
  workspaceId?: string;
  creditsRemaining?: number;
  collaborator?: {
    userId: string;
    name: string;
  };
}) {
  const { theme, isDark } = useStudioTheme();
  const agentRuntimeRef = useRef(createAgentRuntimeBridge(creditsRemaining));
  agentRuntimeRef.current.creditsRemaining = creditsRemaining;
  const peersRef = useRef<StudioCollaborator[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const didAutoFitRef = useRef(false);
  const [nodes, setNodes] = useState<StudioNode[]>(() =>
    initialNodes.map((node, index) => normalizeStudioNode(node, index)),
  );
  const [edges, setEdges] = useState<StudioEdge[]>(initialEdges);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(
    showTemplatePickerOnLoad &&
      !initialViewport.ui?.templatePickerDismissed &&
      initialNodes.length === 0,
  );
  const [templatePickerDismissed, setTemplatePickerDismissed] = useState(
    Boolean(initialViewport.ui?.templatePickerDismissed) || initialNodes.length > 0,
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [longFormExportState, setLongFormExportState] = useState<"idle" | "exporting">("idle");
  const [longFormExportUrl, setLongFormExportUrl] = useState<string | null>(null);
  const [agentAutoPrompt, setAgentAutoPrompt] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [canvasTool, setCanvasTool] = useState<StudioCanvasTool>("select");
  const [toolbarPrompt, setToolbarPrompt] = useState("");
  const canvasToolRef = useRef<StudioCanvasTool>("select");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectPreview, setConnectPreview] = useState<{ x: number; y: number } | null>(null);
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);
  const [activeEdgeIds, setActiveEdgeIds] = useState<string[]>([]);
  const [flashEdgeIds, setFlashEdgeIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(initialViewport.zoom);
  const [pan, setPan] = useState(initialViewport.pan);

  const persistViewport = useMemo<StudioViewport>(
    () => ({
      zoom,
      pan,
      ui: { templatePickerDismissed },
    }),
    [zoom, pan, templatePickerDismissed],
  );

  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const enteredNodeIdsRef = useRef<Set<string>>(new Set(initialNodes.map((node) => node.id)));
  const markNodeEntered = useCallback((nodeId: string) => {
    enteredNodeIdsRef.current.add(nodeId);
  }, []);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pendingPanRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const spacePanRef = useRef(false);
  const connectRef = useRef<string | null>(null);
  const snapTargetRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRefState = useRef(persistViewport);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewportRefState.current = persistViewport;

  const completedVideoClips = useMemo(() => {
    return topologicalSort(nodes, edges)
      .filter((node) => node.type === "video" && Boolean(node.data.videoUrl))
      .map((node, index) => ({
        nodeId: node.id,
        title: node.title || `Segment ${index + 1}`,
        prompt: node.data.prompt,
        videoUrl: node.data.videoUrl!,
        durationSec: typeof node.data.duration === "number" ? node.data.duration : undefined,
      }));
  }, [edges, nodes]);

  const completedVideoClipFingerprint = useMemo(
    () => completedVideoClips.map((clip) => `${clip.nodeId}:${clip.videoUrl}`).join("|"),
    [completedVideoClips],
  );

  useEffect(() => {
    setLongFormExportUrl(null);
  }, [completedVideoClipFingerprint]);

  const applyRemoteSync = useCallback((payload: StudioSyncPayload) => {
    const locked = draggingNodeId ? [draggingNodeId] : [];
    const merged = mergeRemoteStudioState(
      {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        viewport: viewportRefState.current,
      },
      {
        nodes: payload.nodes,
        edges: payload.edges,
        viewport: payload.viewport,
      },
      { lockedNodeIds: locked },
    );

    setNodes(merged.nodes);
    setEdges(merged.edges);
    setZoom(merged.viewport.zoom);
    setPan(merged.viewport.pan);
    if (merged.viewport.ui?.templatePickerDismissed) {
      setTemplatePickerDismissed(true);
      setShowTemplatePicker(false);
    }

    return merged;
  }, [draggingNodeId]);

  const markSyncedRef = useRef<(snapshot?: StudioFlowPersistState) => void>(() => undefined);
  const applyRemoteAgentChatRef = useRef<(payload: StudioAgentChatSyncPayload) => void>(() => undefined);

  const {
    clientId,
    peers,
    uniqueCollaborators,
    connection,
    reportPresence,
    scheduleLiveSync,
    flushLiveSync,
    broadcastAgentLive,
    pauseOutboundSync,
    markLocalAgentChatApplied,
  } = useStudioCollaboration({
    sessionId,
    baselineUpdatedAt: initialUpdatedAt,
    collaborator,
    getLiveState: () => ({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      viewport: viewportRefState.current,
    }),
    onRemoteSync: (payload) => {
      const merged = applyRemoteSync(payload);
      markSyncedRef.current(merged);
    },
    onRemoteAgentChat: (payload) => {
      applyRemoteAgentChatRef.current(payload);
    },
  });
  peersRef.current = peers;

  const agentCollaboration = useMemo(
    () => ({
      initialAgentChat,
      clientId,
      saveAgentChat: async (agentChat: StudioAgentChatSnapshot) =>
        saveStudioFlow(sessionId, { agentChat }, { clientId }),
      broadcastAgentLive: async (agentChat: StudioAgentChatSnapshot) => {
        await broadcastAgentLive({
          ...agentChat,
          clientId,
          userId: collaborator?.userId ?? "local",
          name: collaborator?.name ?? "Teammate",
        });
      },
      pauseOutboundSync,
      onLocalAgentChatApplied: markLocalAgentChatApplied,
    }),
    [
      broadcastAgentLive,
      clientId,
      collaborator?.name,
      collaborator?.userId,
      initialAgentChat,
      markLocalAgentChatApplied,
      pauseOutboundSync,
      sessionId,
    ],
  );

  const { saveState, flushSave, markSynced } = useStudioFlowAutoSave(
    sessionId,
    { nodes, edges, viewport: persistViewport },
    {
      nodes: initialNodes,
      edges: initialEdges,
      viewport: {
        ...initialViewport,
        ui: {
          templatePickerDismissed:
            Boolean(initialViewport.ui?.templatePickerDismissed) || initialNodes.length > 0,
        },
      },
    },
    { clientId },
  );

  markSyncedRef.current = markSynced;

  useLayoutEffect(() => {
    if (didAutoFitRef.current || initialNodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas.getBoundingClientRect();
    if (width < 100 || height < 100) return;

    if (!anyNodeVisible(initialNodes, width, height, zoom, pan)) {
      const fit = fitViewportToNodes(initialNodes, width, height);
      if (fit) {
        setZoom(fit.zoom);
        setPan(fit.pan);
      }
    }

    didAutoFitRef.current = true;
  }, [initialNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastSent = 0;
    const onPointerMove = (event: PointerEvent) => {
      const now = Date.now();
      if (now - lastSent < 80) return;
      lastSent = now;
      const point = canvasPointFromEvent(event, canvas, zoom, pan);
      void reportPresence(point);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    return () => canvas.removeEventListener("pointermove", onPointerMove);
  }, [pan, reportPresence, zoom]);

  const dismissTemplatePicker = useCallback(() => {
    setShowTemplatePicker(false);
    setTemplatePickerDismissed(true);
  }, []);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);

  useEffect(() => {
    canvasToolRef.current = canvasTool;
  }, [canvasTool]);

  useEffect(() => {
    if (!selectedId) {
      setInspectorOpen(false);
    }
  }, [selectedId]);

  const selectedVideoReferences = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "video") {
      return { imageUrl: undefined, imageUrls: [] as string[], videoUrl: undefined };
    }
    const plan = buildVideoGenerationContext(selectedNode, nodes, edges);
    return {
      imageUrl: plan.media.imageUrl,
      imageUrls: plan.media.imageUrls,
      videoUrl: plan.media.videoUrl,
    };
  }, [selectedNode, nodes, edges]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<StudioNode["data"]>) => {
    const next = nodesRef.current.map((node) => {
      if (node.id !== nodeId) return node;

      const nextNode: StudioNode = {
        ...node,
        data: {
          ...node.data,
          ...data,
          ...(node.data.status === "failed" ? { status: "idle" as const, error: undefined } : {}),
        },
      };

      if (nextNode.type === "image" || nextNode.type === "video") {
        nextNode.height = getRenderedNodeHeight(nextNode);
      }

      return nextNode;
    });
    nodesRef.current = next;
    setNodes(next);
  }, []);

  const handleMediaDimensions = useCallback((nodeId: string, mediaWidth: number, mediaHeight: number) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        if (node.type !== "image" && node.type !== "video") return node;

        const existingWidth = node.type === "image" ? node.data.imageWidth : node.data.videoWidth;
        const existingHeight = node.type === "image" ? node.data.imageHeight : node.data.videoHeight;
        if (existingWidth === mediaWidth && existingHeight === mediaHeight) return node;

        const dimensionPatch =
          node.type === "image"
            ? { imageWidth: mediaWidth, imageHeight: mediaHeight }
            : { videoWidth: mediaWidth, videoHeight: mediaHeight };

        const nextNode: StudioNode = {
          ...node,
          data: { ...node.data, ...dimensionPatch },
        };

        return {
          ...nextNode,
          height: getRenderedNodeHeight(nextNode),
        };
      }),
    );
  }, []);

  const syncMediaNodeHeight = useCallback((node: StudioNode) => {
    if (node.type !== "image" && node.type !== "video") return node;
    return { ...node, height: getRenderedNodeHeight(node) };
  }, []);

  const copySessionLink = async () => {
    const url = `${window.location.origin}/studio-pro/${sessionId}`;
    await navigator.clipboard.writeText(url);
    notify.success("Studio link copied.");
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const waitForLongFormExport = async (jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (attempt > 0) {
        await sleep(5_000);
      }

      const response = await fetch(`/api/studio/long-form/${jobId}`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as LongFormExportResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not check long-form export status.");
      }

      if (data.job?.status === "COMPLETED" && data.job.finalVideoUrl) {
        return data.job.finalVideoUrl;
      }

      if (data.job?.status === "FAILED") {
        throw new Error(data.job.errorMessage ?? "Long-form export failed.");
      }
    }

    throw new Error("Long-form export is still processing. Check your library again shortly.");
  };

  const startLongFormExport = async (options?: { title?: string; waitForCompletion?: boolean }) => {
    if (completedVideoClips.length < 2) {
      throw new Error("Generate at least two video segments before exporting long-form.");
    }

    const targetDurationSec = completedVideoClips.reduce(
      (total, clip) => total + (clip.durationSec ?? 0),
      0,
    );
    const response = await fetch("/api/studio/long-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flowId: sessionId,
        title: options?.title?.trim() || `${flowName || "Studio Pro"} long-form export`,
        targetDurationSec: targetDurationSec > 0 ? targetDurationSec : undefined,
        settings: { source: "studio-pro" },
        clips: completedVideoClips,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as LongFormExportResponse;

    if (!response.ok && response.status !== 202) {
      throw new Error(data.error ?? data.job?.errorMessage ?? "Long-form export failed.");
    }

    if (!data.job?.id) {
      throw new Error("Long-form export did not return a job id.");
    }

    const shouldWait = options?.waitForCompletion ?? true;
    const finalVideoUrl =
      data.job.finalVideoUrl ??
      (data.queued && shouldWait ? await waitForLongFormExport(data.job.id) : null);

    if (!finalVideoUrl && (!data.queued || shouldWait)) {
      throw new Error(data.error ?? data.job.errorMessage ?? "Long-form export failed.");
    }

    return {
      jobId: data.job.id,
      status: finalVideoUrl ? "COMPLETED" : data.job.status,
      finalVideoUrl,
    };
  };

  const exportLongFormVideo = async () => {
    if (longFormExportUrl) {
      window.open(longFormExportUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setLongFormExportState("exporting");

    try {
      const result = await startLongFormExport();
      setLongFormExportUrl(result.finalVideoUrl);
      notify.success("Long-form video exported.", {
        description: "Use the film button again to open the finished MP4.",
      });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Long-form export failed.");
    } finally {
      setLongFormExportState("idle");
    }
  };

  const mutateEdges = useCallback((mutator: (current: StudioEdge[]) => StudioEdge[]) => {
    const next = mutator(edgesRef.current);
    if (next === edgesRef.current) return false;
    edgesRef.current = next;
    setEdges(next);
    return true;
  }, []);

  const addConnection = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return false;

    if (edgesRef.current.some((edge) => edge.source === sourceId && edge.target === targetId)) {
      return true;
    }

    let created = false;
    const changed = mutateEdges((current) => {
      if (current.some((edge) => edge.source === sourceId && edge.target === targetId)) {
        created = true;
        return current;
      }
      if (wouldCreateCycle(sourceId, targetId, current)) {
        return current;
      }

      created = true;
      return [...current, { id: `e-${sourceId}-${targetId}`, source: sourceId, target: targetId }];
    });

    if (created) {
      if (changed) {
        setFlashEdgeIds([`e-${sourceId}-${targetId}`]);
        window.setTimeout(() => setFlashEdgeIds([]), 700);
        void flushSave();
      }
    }

    return created;
  }, [flushSave, mutateEdges]);

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((current) => {
        if (!current.some((edge) => edge.id === edgeId)) return current;
        return current.filter((edge) => edge.id !== edgeId);
      });
      setSelectedEdgeId((current) => (current === edgeId ? null : current));
      void flushSave();
    },
    [flushSave],
  );

  const disconnectNodeEdges = useCallback(
    (nodeId: string, direction: "incoming" | "outgoing" | "all" = "incoming") => {
      const changed = mutateEdges((current) => {
        const next = current.filter((edge) => {
          if (direction === "incoming") return edge.target !== nodeId;
          if (direction === "outgoing") return edge.source !== nodeId;
          return edge.source !== nodeId && edge.target !== nodeId;
        });
        return next.length === current.length ? current : next;
      });
      if (changed) {
        setSelectedEdgeId(null);
        void flushSave();
      }
    },
    [flushSave, mutateEdges],
  );

  const removeIncomingEdges = useCallback(
    (targetId: string) => {
      disconnectNodeEdges(targetId, "incoming");
    },
    [disconnectNodeEdges],
  );

  const cancelConnection = useCallback(() => {
    connectRef.current = null;
    snapTargetRef.current = null;
    setConnectingFrom(null);
    setConnectPreview(null);
    setSnapTargetId(null);
  }, []);

  const finishConnection = useCallback(
    (targetId: string) => {
      const sourceId = connectRef.current;
      if (!sourceId || sourceId === targetId) {
        cancelConnection();
        return;
      }

      addConnection(sourceId, targetId);
      cancelConnection();
    },
    [addConnection, cancelConnection],
  );

  useEffect(() => {
    if (!connectingFrom) return;

    const onPointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = canvasPointFromEvent(event, canvas, zoom, pan);
      const snap = findSnapTarget(point, nodes, connectingFrom);
      setConnectPreview(snap ? { x: snap.x, y: snap.y } : point);
      snapTargetRef.current = snap?.nodeId ?? null;
      setSnapTargetId(snap?.nodeId ?? null);
    };

    const onPointerUp = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("[data-studio-port]");
      if (target) {
        const side = target.getAttribute("data-studio-port");
        const nodeId = target.getAttribute("data-node-id");
        if (side === "input" && nodeId) {
          finishConnection(nodeId);
          return;
        }
      }

      if (snapTargetRef.current) {
        finishConnection(snapTargetRef.current);
        return;
      }

      cancelConnection();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelConnection();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelConnection, connectingFrom, finishConnection, nodes, pan, zoom]);

  const viewportVisibleBounds = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { minX: 0, minY: 0, maxX: 960, maxY: 640 };
    }

    const rect = canvas.getBoundingClientRect();
    const inset = {
      top: 72,
      bottom: 132,
      left: agentOpen ? 380 : 24,
      right: inspectorOpen ? 320 : 24,
    };

    return {
      minX: (inset.left - pan.x) / zoom,
      minY: (inset.top - pan.y) / zoom,
      maxX: (rect.width - inset.right - pan.x) / zoom,
      maxY: (rect.height - inset.bottom - pan.y) / zoom,
    };
  }, [agentOpen, inspectorOpen, pan.x, pan.y, zoom]);

  const viewportCenterPoint = useCallback(() => {
    const bounds = viewportVisibleBounds();
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }, [viewportVisibleBounds]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((item) => item.id === nodeId);
      const canvas = canvasRef.current;
      if (!node || !canvas) {
        setSelectedId(nodeId);
        return;
      }

      setSelectedId(nodeId);
      const rect = canvas.getBoundingClientRect();
      const nodeHeight = getRenderedNodeHeight(node);
      const centerX = node.x + node.width / 2;
      const centerY = node.y + nodeHeight / 2;

      setPan({
        x: Number((rect.width / 2 - centerX * zoom).toFixed(1)),
        y: Number((rect.height / 2 - centerY * zoom).toFixed(1)),
      });
    },
    [zoom],
  );

  const setFlowLayout = useCallback((nextNodes: StudioNode[], nextEdges: StudioEdge[]) => {
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, []);

  const addNode = (type: StudioNodeType) => {
    dismissTemplatePicker();
    setContextMenu(null);

    const draft = createNode(type, 0, 0);
    const draftHeight = getRenderedNodeHeight(draft);
    const bounds = viewportVisibleBounds();
    const center = viewportCenterPoint();
    const anchor = {
      x: snapToGrid(center.x - draft.width / 2),
      y: snapToGrid(center.y - draftHeight / 2),
    };
    const { x, y } = findNodePlacement(nodes, draft, anchor, bounds);
    const node = createNode(type, x, y, { zIndex: getNextNodeZIndex(nodes) });
    setNodes((current) => [...current, node]);
    setSelectedId(node.id);
    setInspectorOpen(true);
    void flushSave();
  };

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((current) =>
        sortNodesByZIndex(current.filter((node) => node.id !== nodeId)).map((node, index) => ({
          ...node,
          zIndex: index,
        })),
      );
      setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedId((current) => (current === nodeId ? null : current));
      setSelectedEdgeId(null);
      setContextMenu(null);
      void flushSave();
    },
    [flushSave],
  );

  const bringForward = useCallback(
    (nodeId: string) => {
      setNodes((current) => bringNodeForward(current, nodeId));
      void flushSave();
    },
    [flushSave],
  );

  const sendBackward = useCallback(
    (nodeId: string) => {
      setNodes((current) => sendNodeBackward(current, nodeId));
      void flushSave();
    },
    [flushSave],
  );

  const applyTemplate = (template: StudioTemplate) => {
    const flow = buildTemplateFlow(template);
    dismissTemplatePicker();
    enteredNodeIdsRef.current = new Set(flow.nodes.map((node) => node.id));
    nodesRef.current = flow.nodes;
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setSelectedId(null);
    void (async () => {
      await flushLiveSync();
      markSyncedRef.current({
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: viewportRefState.current,
      });
      await flushSave();
    })();
  };

  const startBlankCanvas = () => {
    dismissTemplatePicker();
    void flushSave();
  };

  const startWithAgent = useCallback(
    (description: string) => {
      const prompt = description.trim();
      if (!prompt) return;

      dismissTemplatePicker();
      setAgentAutoPrompt(prompt);
      setAgentOpen(true);
      void flushSave();
    },
    [dismissTemplatePicker, flushSave],
  );

  const handlePortPointerDown = (nodeId: string, side: "input" | "output", event: React.PointerEvent) => {
    if (side === "input") {
      if (connectRef.current) return;
      event.preventDefault();
      if (getIncomingEdges(nodeId, edges).length > 0) {
        removeIncomingEdges(nodeId);
      }
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    connectRef.current = nodeId;
    setConnectingFrom(nodeId);
    setSelectedEdgeId(null);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPointFromEvent(event, canvas, zoom, pan);
    setConnectPreview(point);
  };

  const handlePortPointerUp = (nodeId: string, side: "input" | "output", event: React.PointerEvent) => {
    if (side !== "input" || !connectRef.current) return;
    event.preventDefault();
    finishConnection(nodeId);
  };

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      panRef.current = {
        startX: clientX,
        startY: clientY,
        originX: pan.x,
        originY: pan.y,
      };
      setIsPanning(true);
    },
    [pan.x, pan.y],
  );

  const handleDragStart = (nodeId: string, event: React.PointerEvent) => {
    if (event.button !== 0) return;

    if (spacePanRef.current) {
      event.preventDefault();
      event.stopPropagation();
      startPan(event.clientX, event.clientY);
      return;
    }

    const node = nodes.find((item) => item.id === nodeId);
    const canvas = canvasRef.current;
    if (!node || !canvas) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = canvasPointFromEvent(event, canvas, zoom, pan);
    dragRef.current = {
      id: nodeId,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    };
    setDraggingNodeId(nodeId);
    setSelectedId(nodeId);

    const flushDrag = () => {
      rafRef.current = null;
      const pending = pendingDragRef.current;
      if (!pending) return;
      setNodes((current) =>
        current.map((item) =>
          item.id === pending.id
            ? { ...item, x: pending.x, y: pending.y }
            : item,
        ),
      );
      scheduleLiveSync();
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const nextPoint = canvasPointFromEvent(moveEvent, canvasRef.current, zoom, pan);
      pendingDragRef.current = {
        id: dragRef.current.id,
        x: snapToGrid(nextPoint.x - dragRef.current.offsetX),
        y: snapToGrid(nextPoint.y - dragRef.current.offsetY),
      };
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushDrag);
      }
    };

    const onPointerUp = () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const pending = pendingDragRef.current;
      if (pending) {
        setNodes((current) =>
          current.map((item) =>
            item.id === pending.id
              ? { ...item, x: pending.x, y: pending.y }
              : item,
          ),
        );
      }

      dragRef.current = null;
      pendingDragRef.current = null;
      setDraggingNodeId(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      void (async () => {
        await flushLiveSync();
        await flushSave();
      })();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleCanvasPointerDown = (event: React.PointerEvent) => {
    if (isStudioOverlayTarget(event.target)) {
      return;
    }

    const onBackground = isCanvasBackgroundTarget(event.target);

    if (
      event.button === 1 ||
      (event.button === 0 && event.altKey) ||
      (event.button === 0 && spacePanRef.current) ||
      (event.button === 0 && canvasToolRef.current === "pan" && onBackground)
    ) {
      event.preventDefault();
      startPan(event.clientX, event.clientY);
      return;
    }

    if (event.button === 0 && onBackground) {
      pendingPanRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const pending = pendingPanRef.current;
        if (!pending) return;

        const dx = moveEvent.clientX - pending.startX;
        const dy = moveEvent.clientY - pending.startY;
        if (Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD) return;

        pendingPanRef.current = null;
        panRef.current = pending;
        setIsPanning(true);
        setPan({
          x: pending.originX + dx,
          y: pending.originY + dy,
        });
      };

      const onPointerUp = () => {
        if (pendingPanRef.current) {
          setSelectedId(null);
          setSelectedEdgeId(null);
          setContextMenu(null);
          cancelConnection();
        }
        pendingPanRef.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return;
    }

    if (event.button !== 0) return;
    setSelectedId(null);
    setSelectedEdgeId(null);
    setContextMenu(null);
    cancelConnection();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
        event.preventDefault();
        spacePanRef.current = true;
        setSpacePan(true);
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!selectedEdgeId) return;
      event.preventDefault();
      removeEdge(selectedEdgeId);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      spacePanRef.current = false;
      setSpacePan(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [removeEdge, selectedEdgeId]);

  useEffect(() => {
    if (!isPanning) return;

    const onPointerMove = (event: PointerEvent) => {
      if (!panRef.current) return;
      setPan({
        x: panRef.current.originX + (event.clientX - panRef.current.startX),
        y: panRef.current.originY + (event.clientY - panRef.current.startY),
      });
    };

    const onPointerUp = () => {
      panRef.current = null;
      setIsPanning(false);
      void flushSave();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isPanning, flushSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [data-studio-node], .studio-node-body, .studio-inspector, .studio-agent, .studio-toolbar",
        )
      ) {
        return;
      }

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = clampZoom(zoom * zoomFactor);
      const scale = nextZoom / zoom;

      setPan({
        x: pointerX - (pointerX - pan.x) * scale,
        y: pointerY - (pointerY - pan.y) * scale,
      });
      setZoom(nextZoom);
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [pan.x, pan.y, zoom]);

  const executeNode = async (nodeId: string, workingNodes: StudioNode[], workingEdges: StudioEdge[]) => {
    const node = workingNodes.find((item) => item.id === nodeId);
    if (!node) return workingNodes;

    const incomingEdgeIds = workingEdges.filter((edge) => edge.target === nodeId).map((edge) => edge.id);
    setActiveEdgeIds(incomingEdgeIds);

    const runningNodes = workingNodes.map((item) =>
      item.id === nodeId ? { ...item, data: { ...item.data, status: "running" as const, error: undefined } } : item,
    );
    nodesRef.current = runningNodes;
    setNodes(runningNodes);

    try {
      const result = await runStudioNode(node, runningNodes, workingEdges);
      const doneNodes = runningNodes.map((item) => {
        if (item.id !== nodeId) return item;
        return syncMediaNodeHeight({
          ...item,
          data: { ...item.data, ...result, status: "done" as const, error: undefined },
        });
      });
      nodesRef.current = doneNodes;
      setNodes(doneNodes);
      const completed = doneNodes.find((item) => item.id === nodeId);
      if (completed) {
        registerStudioNodeMedia(completed);
      }
      return doneNodes;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Node run failed.";
      const failedNodes = runningNodes.map((item) =>
        item.id === nodeId ? { ...item, data: { ...item.data, status: "failed" as const, error: message } } : item,
      );
      nodesRef.current = failedNodes;
      setNodes(failedNodes);
      notify.error(message);
      throw error;
    } finally {
      setActiveEdgeIds([]);
    }
  };

  const executeNodeBatch = async (
    batch: StudioNode[],
    workingNodes: StudioNode[],
    workingEdges: StudioEdge[],
  ) => {
    if (batch.length === 0) return workingNodes;

    const batchIds = new Set(batch.map((node) => node.id));
    const incomingEdgeIds = workingEdges
      .filter((edge) => batchIds.has(edge.target))
      .map((edge) => edge.id);
    setActiveEdgeIds(incomingEdgeIds);

    const runningNodes = workingNodes.map((item) =>
      batchIds.has(item.id)
        ? { ...item, data: { ...item.data, status: "running" as const, error: undefined } }
        : item,
    );
    nodesRef.current = runningNodes;
    setNodes(runningNodes);

    const results = await Promise.allSettled(
      batch.map(async (node) => {
        const currentNode = runningNodes.find((item) => item.id === node.id) ?? node;
        const result = await runStudioNode(currentNode, runningNodes, workingEdges);
        return { nodeId: node.id, result };
      }),
    );

    const resultByNode = new Map<string, Awaited<ReturnType<typeof runStudioNode>>>();
    const errorByNode = new Map<string, string>();

    for (let index = 0; index < results.length; index += 1) {
      const nodeId = batch[index]!.id;
      const settled = results[index]!;
      if (settled.status === "fulfilled") {
        resultByNode.set(nodeId, settled.value.result);
      } else {
        const message = settled.reason instanceof Error ? settled.reason.message : "Node run failed.";
        errorByNode.set(nodeId, message);
      }
    }

    const nextNodes = runningNodes.map((item) => {
      const result = resultByNode.get(item.id);
      if (result) {
        return syncMediaNodeHeight({
          ...item,
          data: { ...item.data, ...result, status: "done" as const, error: undefined },
        });
      }

      const error = errorByNode.get(item.id);
      if (error) {
        return { ...item, data: { ...item.data, status: "failed" as const, error } };
      }

      return item;
    });

    nodesRef.current = nextNodes;
    setNodes(nextNodes);

    for (const nodeId of Array.from(resultByNode.keys())) {
      const completed = nextNodes.find((item) => item.id === nodeId);
      if (completed) registerStudioNodeMedia(completed);
    }

    if (errorByNode.size > 0) {
      const firstError = Array.from(errorByNode.values())[0] ?? "Node run failed.";
      notify.error(firstError);
      throw new Error(firstError);
    }

    return nextNodes;
  };

  const runSingleNode = async (nodeId: string) => {
    try {
      await executeNode(nodeId, nodes, edges);
      await flushSave();
    } catch {
      // Error stored on node.
    }
  };

  const runFlow = async () => {
    setIsRunningFlow(true);
    setNodes((current) =>
      current.map((node) => ({ ...node, data: { ...node.data, status: "idle", error: undefined } })),
    );

    try {
      let workingNodes: StudioNode[] = nodesRef.current.map((node) => ({
        ...node,
        data: { ...node.data, status: "idle" as const, error: undefined },
      }));
      const batches = dependencyBatches(workingNodes, edgesRef.current);

      for (const batch of batches) {
        workingNodes =
          batch.length === 1
            ? await executeNode(batch[0]!.id, workingNodes, edgesRef.current)
            : await executeNodeBatch(batch, workingNodes, edgesRef.current);
      }

      await flushSave();
    } catch {
      await flushSave();
    } finally {
      setIsRunningFlow(false);
      setActiveEdgeIds([]);
    }
  };

  const agentActions = useMemo<StudioAgentActions>(
    () => ({
      getState: () => ({ nodes: nodesRef.current, edges: edgesRef.current }),
      addNode: (node) => {
        dismissTemplatePicker();
        markNodeEntered(node.id);
        const next = [...nodesRef.current, node];
        nodesRef.current = next;
        setNodes(next);
      },
      updateNodeData,
      connectNodes: addConnection,
      disconnectNode: disconnectNodeEdges,
      deleteNode,
      applyTemplate: async (template) => {
        applyTemplate(template);
      },
      runNode: async (nodeId) => {
        const state = nodesRef.current;
        const edgeState = edgesRef.current;
        try {
          const updated = await executeNode(nodeId, state, edgeState);
          await flushSave();
          return updated.find((item) => item.id === nodeId) ?? null;
        } catch {
          await flushSave();
          return nodesRef.current.find((item) => item.id === nodeId) ?? null;
        }
      },
      runAll: runFlow,
      exportLongFormVideo: async (options) => {
        const result = await startLongFormExport({
          title: options?.title,
          waitForCompletion: false,
        });
        if (result.finalVideoUrl) {
          setLongFormExportUrl(result.finalVideoUrl);
        }
        return result;
      },
      selectNode: setSelectedId,
      focusNode,
      setFlowLayout,
      viewportCenter: viewportCenterPoint,
      flushSave,
      listAssets: async (kind, limit = 12) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (kind) params.set("kind", kind);
        const response = await fetch(`/api/assets?${params}`);
        if (!response.ok) {
          throw new Error("Could not load assets.");
        }
        const data = (await response.json()) as { items?: UserMediaAssetDto[] };
        return data.items ?? [];
      },
      attachAssetToNode: (nodeId, asset) => {
        if (asset.kind === "image") {
          updateNodeData(nodeId, {
            imageUrl: asset.url,
            output: asset.url,
            imageWidth: asset.width ?? undefined,
            imageHeight: asset.height ?? undefined,
            mediaSource: asset.source === "uploaded" ? "upload" : "generated",
            status: "done",
            error: undefined,
          });
          return;
        }
        if (asset.kind === "video") {
          updateNodeData(nodeId, {
            videoUrl: asset.url,
            output: asset.url,
            videoWidth: asset.width ?? undefined,
            videoHeight: asset.height ?? undefined,
            mediaSource: asset.source === "uploaded" ? "upload" : "generated",
            status: "done",
            error: undefined,
          });
          return;
        }
        updateNodeData(nodeId, {
          audioUrl: asset.url,
          output: asset.url,
          mediaSource: asset.source === "uploaded" ? "upload" : "generated",
          status: "done",
          error: undefined,
        });
      },
      restoreCanvasSnapshot: (snapshot) => {
        setFlowLayout(snapshot.nodes, snapshot.edges);
      },
      popUndoSnapshot: () => {
        const snapshot = agentRuntimeRef.current.undoSnapshot;
        agentRuntimeRef.current.undoSnapshot = null;
        return snapshot;
      },
      getCollabContext: () => buildCollabContext(peersRef.current, nodesRef.current, clientId),
      getFlowMemory: () => agentRuntimeRef.current.memory,
      setFlowMemory: (memory) => {
        agentRuntimeRef.current.memory = memory;
      },
    }),
    [
      addConnection,
      applyTemplate,
      clientId,
      deleteNode,
      dismissTemplatePicker,
      executeNode,
      flushSave,
      focusNode,
      markNodeEntered,
      disconnectNodeEdges,
      removeIncomingEdges,
      runFlow,
      startLongFormExport,
      setFlowLayout,
      updateNodeData,
      viewportCenterPoint,
    ],
  );

  const showPicker = showTemplatePicker;

  const handleToolbarPromptSubmit = useCallback(() => {
    const text = toolbarPrompt.trim();
    if (!text) return;

    if (selectedId) {
      updateNodeData(selectedId, { prompt: text });
      setToolbarPrompt("");
      return;
    }

    setAgentAutoPrompt(text);
    setAgentOpen(true);
    setToolbarPrompt("");
  }, [selectedId, toolbarPrompt, updateNodeData]);

  return (
    <div
      className={cn(
        "studio-pro relative h-full min-h-0 w-full overflow-hidden bg-[#fcfcfc] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",
        theme === "dark" && "dark",
      )}
    >
      <div
        ref={canvasRef}
        data-studio-canvas-bg
        className={cnCanvas(isPanning, spacePan, connectingFrom, canvasTool)}
        onPointerDown={handleCanvasPointerDown}
      >
          <StudioRemoteCursors peers={peers} zoom={zoom} pan={pan} />
          <div
            data-studio-canvas-bg
            className="studio-canvas-grid absolute inset-0 bg-zinc-50/80 dark:bg-zinc-900/90"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(161,161,170,0.35) 1px, transparent 1px)",
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />
          <div
            ref={viewportRef}
            className="absolute inset-0 origin-top-left will-change-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <StudioConnectionLayer
              nodes={nodes}
              edges={edges}
              activeEdgeIds={activeEdgeIds}
              flashEdgeIds={flashEdgeIds}
              selectedEdgeId={selectedEdgeId}
              connectingFrom={connectingFrom}
              connectPreview={connectPreview}
              snapTargetId={snapTargetId}
              onEdgeSelect={(edgeId) => {
                setSelectedEdgeId(edgeId);
                setSelectedId(null);
              }}
              onEdgeRemove={removeEdge}
            />

            {nodes.map((node) => (
              <StudioNodeCard
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                connectingFrom={connectingFrom}
                snapTargetId={snapTargetId}
                dragging={draggingNodeId === node.id}
                hasIncomingConnection={edges.some((edge) => edge.target === node.id)}
                animateEnter={!enteredNodeIdsRef.current.has(node.id)}
                onSelect={() => {
                  setSelectedId(node.id);
                  setSelectedEdgeId(null);
                  setContextMenu(null);
                  setInspectorOpen(true);
                }}
                onDragStart={(event) => handleDragStart(node.id, event)}
                onPortPointerDown={handlePortPointerDown}
                onPortPointerUp={handlePortPointerUp}
                onMediaDimensions={(width, height) => handleMediaDimensions(node.id, width, height)}
                onRunNode={() => void runSingleNode(node.id)}
                onEnterAnimated={markNodeEntered}
                onContextMenu={(event) => {
                  setSelectedId(node.id);
                  setSelectedEdgeId(null);
                  setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
                }}
                isRunningFlow={isRunningFlow}
                onChange={(data) => updateNodeData(node.id, data)}
              />
            ))}
          </div>

          {contextMenu ? (
            <StudioNodeContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              isDark={isDark}
              canBringForward={canBringNodeForward(nodes, contextMenu.nodeId)}
              canSendBackward={canSendNodeBackward(nodes, contextMenu.nodeId)}
              onDelete={() => deleteNode(contextMenu.nodeId)}
              onBringForward={() => bringForward(contextMenu.nodeId)}
              onSendBackward={() => sendBackward(contextMenu.nodeId)}
              onClose={() => setContextMenu(null)}
            />
          ) : null}

          {showPicker ? (
            <StudioTemplatePicker
              onSelect={applyTemplate}
              onStartBlank={startBlankCanvas}
              onStartWithAgent={startWithAgent}
              replacing={nodes.length > 0}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 top-3 z-40 px-3">
            <div className="pointer-events-auto" data-studio-overlay onPointerDown={stopCanvasPointer}>
              <StudioProHeader
                sessionId={sessionId}
                flowName={flowName}
                saveState={saveState}
                copiedLink={copiedLink}
                zoom={zoom}
                collaborators={uniqueCollaborators}
                connection={connection}
                agentOpen={agentOpen}
                onZoomIn={() => setZoom((value) => clampZoom(value + 0.1))}
                onZoomOut={() => setZoom((value) => clampZoom(value - 0.1))}
                onToggleAgent={() => setAgentOpen((open) => !open)}
                onCopyLink={() => void copySessionLink()}
                onPublishTemplate={() => setPublishOpen(true)}
                onExportLongForm={() => void exportLongFormVideo()}
                longFormExportState={longFormExportState}
                longFormExportUrl={longFormExportUrl}
                canExportLongForm={completedVideoClips.length >= 2}
              />
            </div>
          </div>

          {connectingFrom ? (
            <div className="pointer-events-none absolute left-4 top-16 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 shadow-sm dark:bg-purple-950/60 dark:text-purple-300">
              Drag to an input port · Esc to cancel
            </div>
          ) : selectedEdgeId ? (
            <div className="pointer-events-none absolute left-4 top-16 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-sm">
              Connection selected · Delete to remove · double-click line to disconnect
            </div>
          ) : null}

          {!showPicker && nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-md rounded-3xl bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                <p className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">Blank canvas</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Use the toolbar below to add nodes, describe your flow, and connect cards left-to-right.
                </p>
                <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <StudioMultiClipWorkflow />
                </div>
              </div>
            </div>
          ) : null}

          {!showPicker ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center">
              <StudioFloatingToolbar
                prompt={toolbarPrompt}
                onPromptChange={setToolbarPrompt}
                onPromptSubmit={handleToolbarPromptSubmit}
                canvasTool={canvasTool}
                onCanvasToolChange={setCanvasTool}
                agentOpen={agentOpen}
                onToggleAgent={() => setAgentOpen((open) => !open)}
                inspectorOpen={inspectorOpen}
                onToggleInspector={() => setInspectorOpen((open) => !open)}
                hasSelectedNode={Boolean(selectedNode)}
                onAddNode={addNode}
                onOpenTemplates={() => setShowTemplatePicker(true)}
              />
            </div>
          ) : null}

          {!showPicker ? (
            <div
              className={cn(
                "studio-agent pointer-events-auto group absolute bottom-24 top-16 z-20 overflow-hidden border-r border-zinc-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out dark:border-zinc-700 dark:bg-zinc-900",
                agentOpen
                  ? "left-0 w-[min(360px,calc(100%-2rem))] rounded-r-2xl"
                  : "-left-0 w-12 rounded-r-2xl hover:w-[min(360px,calc(100%-2rem))]",
              )}
              data-studio-overlay
              onPointerDown={stopCanvasPointer}
              onWheel={stopCanvasWheel}
            >
              <div
                className={cn(
                  "h-full w-full transition-opacity duration-300",
                  agentOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                <StudioProAgentPanel
                  flowId={sessionId}
                  workspaceId={workspaceId}
                  actions={agentActions}
                  collaboration={agentCollaboration}
                  agentRuntimeRef={agentRuntimeRef}
                  applyRemoteAgentChatRef={applyRemoteAgentChatRef}
                  autoStartPrompt={agentAutoPrompt}
                  onAutoStartPromptConsumed={() => setAgentAutoPrompt(null)}
                  onClose={() => setAgentOpen(false)}
                />
              </div>
              {!agentOpen ? (
                <button
                  type="button"
                  onClick={() => setAgentOpen(true)}
                  className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-300 group-hover:opacity-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </button>
              ) : null}
            </div>
          ) : null}

          {inspectorOpen && selectedNode ? (
            <div
              className="studio-inspector pointer-events-auto absolute bottom-24 right-4 top-16 z-20 w-[min(300px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-zinc-700 dark:bg-zinc-900"
              data-studio-overlay
              onPointerDown={stopCanvasPointer}
              onWheel={stopCanvasWheel}
            >
              <StudioProInspector
                node={selectedNode}
                onChange={updateNodeData}
                onClose={() => {
                  setInspectorOpen(false);
                  setSelectedId(null);
                }}
                referenceImageUrl={selectedVideoReferences.imageUrl}
                referenceImageUrls={selectedVideoReferences.imageUrls}
                referenceVideoUrl={selectedVideoReferences.videoUrl}
              />
            </div>
          ) : null}

          <PublishTemplateDialog
            open={publishOpen}
            onOpenChange={setPublishOpen}
            sourceFlowId={sessionId}
            defaultTitle={flowName}
          />
      </div>
    </div>
  );
}

function stopCanvasWheel(event: React.WheelEvent) {
  event.stopPropagation();
}

function stopCanvasPointer(event: React.PointerEvent) {
  event.stopPropagation();
}

function cnCanvas(
  isPanning: boolean,
  spacePan: boolean,
  connectingFrom: string | null,
  canvasTool: StudioCanvasTool,
) {
  const classes = [
    "absolute inset-0 overflow-hidden overscroll-none touch-none",
    "studio-canvas",
  ];
  if (isPanning) classes.push("cursor-grabbing");
  else if (connectingFrom) classes.push("cursor-crosshair");
  else if (spacePan || canvasTool === "pan") classes.push("cursor-grab");
  else classes.push("cursor-default");
  return classes.join(" ");
}
