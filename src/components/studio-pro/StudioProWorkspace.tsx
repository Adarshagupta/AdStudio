"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  FolderOpen,
  Minus,
  Plus,
  Redo2,
  Settings2,
  Share2,
  Undo2,
  Zap,
} from "lucide-react";

import { StudioProHeaderStatus } from "@/components/layout/StudioProHeaderStatus";
import { StudioNodeContextMenu } from "@/components/studio-pro/StudioNodeContextMenu";
import { StudioConnectionLayer } from "@/components/studio-pro/StudioConnectionLayer";
import { StudioNodeCard } from "@/components/studio-pro/StudioNodeCard";
import { StudioNodePromptPanel } from "@/components/studio-pro/StudioNodePromptPanel";
import { StudioProInspector } from "@/components/studio-pro/StudioProInspector";
import { StudioTemplatePicker } from "@/components/studio-pro/StudioTemplatePicker";
import { Button } from "@/components/ui/button";
import { useStudioFlowAutoSave } from "@/hooks/useStudioFlowAutoSave";
import { findSnapTarget, getIncomingEdges, topologicalSort, wouldCreateCycle } from "@/lib/studio-pro/graph";
import type { StudioViewport } from "@/lib/studio-pro/flows";
import { runStudioNode } from "@/lib/studio-pro/runner";
import { buildTemplateFlow, type StudioTemplate } from "@/lib/studio-pro/templates";
import {
  bringNodeForward,
  canBringNodeForward,
  canSendNodeBackward,
  createNode,
  findNodePlacement,
  getNextNodeZIndex,
  getNodeHeight,
  getRenderedNodeHeight,
  normalizeStudioNode,
  sendNodeBackward,
  sortNodesByZIndex,
  type StudioEdge,
  type StudioNode,
  type StudioNodeType,
} from "@/lib/studio-pro/types";

const GRID_SIZE = 12;

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
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
  showTemplatePickerOnLoad = false,
}: {
  sessionId: string;
  flowName: string;
  initialNodes: StudioNode[];
  initialEdges: StudioEdge[];
  initialViewport: StudioViewport;
  showTemplatePickerOnLoad?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  const { saveState, flushSave } = useStudioFlowAutoSave(
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
  );

  const dismissTemplatePicker = useCallback(() => {
    setShowTemplatePicker(false);
    setTemplatePickerDismissed(true);
  }, []);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const enteredNodeIdsRef = useRef<Set<string>>(new Set(initialNodes.map((node) => node.id)));
  const markNodeEntered = useCallback((nodeId: string) => {
    enteredNodeIdsRef.current.add(nodeId);
  }, []);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const connectRef = useRef<string | null>(null);
  const snapTargetRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<StudioNode["data"]>) => {
    setNodes((current) =>
      current.map((node) => {
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
      }),
    );
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
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const addConnection = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return false;

    let created = false;
    setEdges((current) => {
      if (current.some((edge) => edge.source === sourceId && edge.target === targetId)) {
        return current;
      }
      if (wouldCreateCycle(sourceId, targetId, current)) {
        return current;
      }

      created = true;
      return [...current, { id: `e-${sourceId}-${targetId}`, source: sourceId, target: targetId }];
    });

    if (created) {
      setFlashEdgeIds([`e-${sourceId}-${targetId}`]);
      window.setTimeout(() => setFlashEdgeIds([]), 700);
      void flushSave();
    }

    return created;
  }, [flushSave]);

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

  const removeIncomingEdges = useCallback(
    (targetId: string) => {
      setEdges((current) => {
        const next = current.filter((edge) => edge.target !== targetId);
        if (next.length === current.length) return current;
        return next;
      });
      setSelectedEdgeId(null);
      void flushSave();
    },
    [flushSave],
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

  const addNode = (type: StudioNodeType) => {
    dismissTemplatePicker();
    setContextMenu(null);

    const draft = createNode(type, 0, 0);
    const { x, y } = findNodePlacement(nodes, draft);
    const node = createNode(type, x, y, { zIndex: getNextNodeZIndex(nodes) });
    setNodes((current) => [...current, node]);
    setSelectedId(node.id);
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
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setSelectedId(null);
    void flushSave();
  };

  const startBlankCanvas = () => {
    dismissTemplatePicker();
    void flushSave();
  };

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

  const handleDragStart = (nodeId: string, event: React.PointerEvent) => {
    if (event.button !== 0) return;

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
            ? { ...item, x: Math.max(24, pending.x), y: Math.max(24, pending.y) }
            : item,
        ),
      );
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
      dragRef.current = null;
      pendingDragRef.current = null;
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDraggingNodeId(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      void flushSave();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleCanvasPointerDown = (event: React.PointerEvent) => {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      event.preventDefault();
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      setIsPanning(true);
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
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!selectedEdgeId) return;
      event.preventDefault();
      removeEdge(selectedEdgeId);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  const executeNode = async (nodeId: string, workingNodes: StudioNode[], workingEdges: StudioEdge[]) => {
    const node = workingNodes.find((item) => item.id === nodeId);
    if (!node) return workingNodes;

    const incomingEdgeIds = workingEdges.filter((edge) => edge.target === nodeId).map((edge) => edge.id);
    setActiveEdgeIds(incomingEdgeIds);

    const runningNodes = workingNodes.map((item) =>
      item.id === nodeId ? { ...item, data: { ...item.data, status: "running" as const, error: undefined } } : item,
    );
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
      setNodes(doneNodes);
      return doneNodes;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Node run failed.";
      const failedNodes = runningNodes.map((item) =>
        item.id === nodeId ? { ...item, data: { ...item.data, status: "failed" as const, error: message } } : item,
      );
      setNodes(failedNodes);
      throw error;
    } finally {
      setActiveEdgeIds([]);
    }
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
      let workingNodes: StudioNode[] = nodes.map((node) => ({
        ...node,
        data: { ...node.data, status: "idle" as const, error: undefined },
      }));
      const sorted = topologicalSort(workingNodes, edges);

      for (const node of sorted) {
        workingNodes = await executeNode(node.id, workingNodes, edges);
      }

      await flushSave();
    } catch {
      await flushSave();
    } finally {
      setIsRunningFlow(false);
      setActiveEdgeIds([]);
    }
  };

  const showPicker = showTemplatePicker;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fcfcfc] text-zinc-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 bg-white/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <StudioProHeaderStatus />
          <span className="hidden text-zinc-300 sm:inline">/</span>
          <Link
            href="/studio-pro"
            className="flex items-center gap-2 text-zinc-500 transition hover:text-zinc-900"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden text-sm font-medium sm:inline">Sessions</span>
          </Link>
          <span className="text-zinc-300">/</span>
          <div>
            <p className="font-display text-sm font-semibold text-zinc-900">{flowName}</p>
            <p className="text-[11px] text-zinc-500">
              Session {sessionId.slice(0, 8)}
              {saveState === "saving" ? " · Saving..." : null}
              {saveState === "saved" ? " · Saved" : null}
              {saveState === "error" ? " · Save failed" : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button disabled={isRunningFlow || nodes.length === 0} onClick={() => void runFlow()}>
            <Zap className="h-4 w-4" />
            {isRunningFlow ? "Running..." : "Run all"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copySessionLink()}>
            <Share2 className="h-4 w-4" />
            {copiedLink ? "Copied" : "Copy link"}
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={canvasRef}
          className={cnCanvas(isPanning, connectingFrom)}
          onPointerDown={handleCanvasPointerDown}
        >
          <div
            className="absolute inset-0 bg-zinc-50/80"
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
              />
            ))}

            {selectedNode ? (
              <div
                className="absolute"
                style={{
                  left: selectedNode.x,
                  top: selectedNode.y + getNodeHeight(selectedNode) + 10,
                  width: selectedNode.width,
                  zIndex: selectedNode.zIndex + 2,
                }}
              >
                <StudioNodePromptPanel
                  node={selectedNode}
                  onChange={(data) => updateNodeData(selectedNode.id, data)}
                />
              </div>
            ) : null}
          </div>

          {contextMenu ? (
            <StudioNodeContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
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
              replacing={nodes.length > 0}
            />
          ) : null}

          {connectingFrom ? (
            <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 shadow-sm">
              Drag to an input port · Esc to cancel
            </div>
          ) : selectedEdgeId ? (
            <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-sm">
              Connection selected · Delete to remove · double-click line to disconnect
            </div>
          ) : null}

          {!showPicker && nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm rounded-3xl bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <p className="font-display text-lg font-semibold text-zinc-900">Blank canvas</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Add nodes below, connect output to input ports, then run your flow.
                </p>
              </div>
            </div>
          ) : null}

          <div
            className="studio-toolbar pointer-events-auto absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <ToolbarButton icon={Plus} label="Add text" onClick={() => addNode("prompt")} />
            <ToolbarButton icon={FolderOpen} label="Assets" />
            <ToolbarButton icon={Settings2} label="Settings" />
            <div className="mx-1 h-6 w-px bg-zinc-100" />
            <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-12 text-center text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(1.2, Number((value + 0.1).toFixed(1))))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="pointer-events-auto absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {(["prompt", "character", "image", "audio", "video"] as StudioNodeType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs capitalize text-zinc-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700"
              >
                + {type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowTemplatePicker(true)}
              className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs text-purple-700 transition hover:bg-purple-100"
            >
              Templates
            </button>
          </div>
        </div>

        <div className="studio-inspector shrink-0">
          <StudioProInspector
            node={selectedNode}
            onChange={updateNodeData}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}

function cnCanvas(isPanning: boolean, connectingFrom: string | null) {
  const classes = ["relative min-w-0 flex-1 overflow-hidden"];
  if (isPanning) classes.push("cursor-grabbing");
  else if (connectingFrom) classes.push("cursor-crosshair");
  return classes.join(" ");
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
