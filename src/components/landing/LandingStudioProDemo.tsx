"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Settings2,
  Share2,
  Undo2,
  Video,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildEdgePath, topologicalSort } from "@/lib/studio-pro/graph";
import type { StudioEdge, StudioNode, StudioNodeType } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";
import { LANDING_PREVIEW_VIDEOS } from "@/lib/landing-media";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.6;
const GRID_SIZE = 12;
const PAN_DRAG_THRESHOLD = 4;
const DEMO_FLOW_NAME = "Summer drop campaign";

const DEMO_EDGES: StudioEdge[] = [
  { id: "demo-e1", source: "demo-script", target: "demo-image" },
  { id: "demo-e2", source: "demo-image", target: "demo-video" },
];

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

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

function isCanvasBackgroundTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[data-studio-demo-bg]"));
}

function createInitialDemoNodes(): StudioNode[] {
  return [
    {
      id: "demo-script",
      type: "prompt",
      x: 36,
      y: 80,
      width: 200,
      height: 128,
      title: "Script",
      subtitle: "Prompt",
      zIndex: 0,
      data: {
        status: "done",
        output:
          "15s UGC hook for skincare — authentic selfie, morning routine, soft natural light.",
      },
    },
    {
      id: "demo-image",
      type: "image",
      x: 300,
      y: 130,
      width: 220,
      height: 200,
      title: "Hero still",
      subtitle: "Image",
      zIndex: 1,
      data: { status: "done", imageUrl: LANDING_PREVIEW_VIDEOS[2] },
    },
    {
      id: "demo-video",
      type: "video",
      x: 580,
      y: 64,
      width: 200,
      height: 268,
      title: "Vertical ad",
      subtitle: "Video · 9:16",
      zIndex: 2,
      data: { status: "done", videoUrl: LANDING_PREVIEW_VIDEOS[3], aspectRatio: "9:16", duration: 5 },
    },
  ];
}

function PreviewVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      className={cn("h-full w-full object-cover", className)}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}

function DemoConnections({
  nodes,
  edges,
  activeEdgeIds,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  activeEdgeIds: string[];
}) {
  return (
    <svg className="pointer-events-none absolute left-0 top-0 h-[3200px] w-[3200px] overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="landing-studio-edge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.9)" />
        </linearGradient>
      </defs>
      {edges.map((edge) => {
        const from = nodes.find((node) => node.id === edge.source);
        const to = nodes.find((node) => node.id === edge.target);
        if (!from || !to) return null;
        const active = activeEdgeIds.includes(edge.id);
        return (
          <path
            key={edge.id}
            className={active ? "studio-edge-flow" : "landing-edge-flow"}
            d={buildEdgePath(from, to)}
            fill="none"
            stroke={active ? "url(#landing-studio-edge)" : "rgba(161,161,170,0.6)"}
            strokeWidth={active ? 3 : 2.5}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function DemoPort({
  side,
  connected,
  active,
}: {
  side: "input" | "output";
  connected?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "absolute top-1/2 z-30 h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-white touch-none",
        side === "input" && "-left-1.5",
        side === "output" && "-right-1.5",
        side === "input" && connected && "border-purple-400 bg-purple-50",
        side === "input" && !connected && "border-zinc-300",
        side === "output" && (active ? "scale-125 border-purple-500 bg-purple-500" : "border-zinc-300"),
      )}
      data-studio-demo-port={side}
      aria-hidden
    />
  );
}

const nodeIcons: Record<StudioNodeType, typeof FileText> = {
  prompt: FileText,
  character: FileText,
  image: ImageIcon,
  audio: FileText,
  video: Video,
  schedule: FileText,
  social: FileText,
};

function DemoNodeCard({
  node,
  selected,
  dragging,
  hasIncoming,
  onSelect,
  onDragStart,
  onRunNode,
  isRunningFlow,
  children,
}: {
  node: StudioNode;
  selected: boolean;
  dragging: boolean;
  hasIncoming: boolean;
  onSelect: () => void;
  onDragStart: (event: React.PointerEvent) => void;
  onRunNode: () => void;
  isRunningFlow: boolean;
  children: ReactNode;
}) {
  const Icon = nodeIcons[node.type];
  const isRunning = node.data.status === "running";
  const cardHeight = getNodeHeight(node);

  return (
    <div
      className={cn(
        "absolute touch-none",
        dragging && "z-[50] scale-[1.02]",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: cardHeight,
        zIndex: dragging ? 50 : node.zIndex + 2,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <DemoPort side="input" connected={hasIncoming} />
      <DemoPort side="output" />
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]",
          selected && "border-purple-300 ring-2 ring-purple-100",
          !selected && "border-zinc-200",
          isRunning && "studio-node-running",
          node.data.status === "done" && "studio-node-done",
          dragging && "cursor-grabbing shadow-[0_16px_48px_rgba(124,58,237,0.18)]",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 cursor-grab items-center gap-1.5 border-b border-zinc-100 px-2 py-1.5 active:cursor-grabbing",
            dragging && "cursor-grabbing",
          )}
          data-studio-demo-drag-handle
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            onSelect();
            onDragStart(event);
          }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-50">
            <Icon className="h-3 w-3 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium leading-tight text-zinc-900">{node.title}</p>
            <p className="truncate text-[8px] text-zinc-500">{node.subtitle}</p>
          </div>
          {isRunning ? (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[7px] text-amber-700">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Run
            </span>
          ) : null}
          {node.data.status === "done" && !isRunning ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-medium text-emerald-700">
              Done
            </span>
          ) : null}
          <button
            type="button"
            disabled={isRunningFlow || isRunning}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRunNode();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-purple-700 disabled:opacity-40"
            aria-label={`Run ${node.title}`}
          >
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-2">{children}</div>
      </div>
    </div>
  );
}

function DemoInspector({ node }: { node: StudioNode | null }) {
  if (!node) {
    return (
      <aside className="studio-inspector hidden w-[28%] max-w-[220px] shrink-0 flex-col border-l border-zinc-100 bg-white sm:flex md:max-w-[260px]">
        <div className="p-4">
          <p className="text-[11px] font-medium text-zinc-900">Inspector</p>
          <p className="mt-2 text-[9px] leading-5 text-zinc-500">
            Click a node to preview settings. Sign up to edit models and save flows.
          </p>
        </div>
      </aside>
    );
  }

  if (node.type === "video") {
    return (
      <aside className="studio-inspector hidden w-[28%] max-w-[220px] shrink-0 flex-col border-l border-zinc-100 bg-white sm:flex md:max-w-[260px]">
        <div className="border-b border-zinc-100 px-3 py-2">
          <p className="text-[11px] font-medium text-zinc-900">{node.title}</p>
          <p className="text-[9px] text-zinc-500">{node.subtitle}</p>
        </div>
        <div className="space-y-3 p-3">
          <InspectorField label="Model" value="Wan 2.2 · image-to-video" />
          <div>
            <p className="mb-1 text-[9px] font-medium text-zinc-700">Duration</p>
            <div className="flex gap-1">
              {["5s", "10s"].map((value, index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => notify.info("Sign up to change video settings.")}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[8px] transition hover:border-purple-200",
                    index === 0
                      ? "border-purple-200 bg-purple-50 text-purple-800"
                      : "border-zinc-200 text-zinc-500",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <InspectorField label="Aspect" value="9:16 vertical" />
          <div className="aspect-[9/11] overflow-hidden rounded-lg border border-zinc-100 bg-zinc-950">
            <PreviewVideo src={LANDING_PREVIEW_VIDEOS[4]} />
          </div>
        </div>
      </aside>
    );
  }

  if (node.type === "image") {
    return (
      <aside className="studio-inspector hidden w-[28%] max-w-[220px] shrink-0 flex-col border-l border-zinc-100 bg-white sm:flex md:max-w-[260px]">
        <div className="border-b border-zinc-100 px-3 py-2">
          <p className="text-[11px] font-medium text-zinc-900">{node.title}</p>
          <p className="text-[9px] text-zinc-500">{node.subtitle}</p>
        </div>
        <div className="space-y-3 p-3">
          <InspectorField label="Model" value="Flux · image gen" />
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-zinc-100 bg-zinc-950">
            <PreviewVideo src={LANDING_PREVIEW_VIDEOS[2]} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="studio-inspector hidden w-[28%] max-w-[220px] shrink-0 flex-col border-l border-zinc-100 bg-white sm:flex md:max-w-[260px]">
      <div className="border-b border-zinc-100 px-3 py-2">
        <p className="text-[11px] font-medium text-zinc-900">{node.title}</p>
        <p className="text-[9px] text-zinc-500">{node.subtitle}</p>
      </div>
      <div className="p-3">
        <InspectorField label="Model" value="Llama 3.1" />
        <p className="mt-2 line-clamp-6 rounded-lg bg-zinc-50 p-2 text-[9px] leading-relaxed text-zinc-600">
          {node.data.output}
        </p>
      </div>
    </aside>
  );
}

function InspectorField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-medium text-zinc-700">{label}</p>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[9px] text-zinc-600">{value}</div>
    </div>
  );
}

function renderNodeBody(node: StudioNode) {
  if (node.type === "prompt") {
    return (
      <p className="line-clamp-4 text-[8px] leading-[1.35] text-zinc-600">{node.data.output}</p>
    );
  }
  if (node.type === "image") {
    return (
      <div className="h-full min-h-[100px] overflow-hidden rounded-lg bg-zinc-100">
        <PreviewVideo src={LANDING_PREVIEW_VIDEOS[2]} />
      </div>
    );
  }
  return (
    <div className="h-full min-h-[140px] overflow-hidden rounded-lg bg-zinc-950">
      <PreviewVideo src={LANDING_PREVIEW_VIDEOS[3]} />
    </div>
  );
}

function demoSignupHint(feature: string) {
  notify.info(`Sign up to ${feature} in Studio Pro.`);
}

const COLLAPSED_CANVAS_MIN_H = "min-h-[300px] sm:min-h-[380px] md:min-h-[440px]";
const EXPANDED_CANVAS_MIN_H = "min-h-0 flex-1";

export function LandingStudioProDemo() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [nodes, setNodes] = useState<StudioNode[]>(createInitialDemoNodes);
  const [edges] = useState(DEMO_EDGES);
  const [selectedId, setSelectedId] = useState<string | null>("demo-video");
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 24, y: 20 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [activeEdgeIds, setActiveEdgeIds] = useState<string[]>([]);

  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pendingPanRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const spacePanRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ id: string; x: number; y: number } | null>(null);

  expandedRef.current = expanded;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const collapseDemo = useCallback(() => setExpanded(false), []);
  const expandDemo = useCallback(() => setExpanded(true), []);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const incomingByTarget = useMemo(() => {
    const map = new Map<string, boolean>();
    edges.forEach((edge) => map.set(edge.target, true));
    return map;
  }, [edges]);

  const simulateRunNode = useCallback(
    async (nodeId: string) => {
      const incoming = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.id);
      setActiveEdgeIds(incoming);
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status: "running" as const, error: undefined } }
            : node,
        ),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, status: "done" as const } } : node,
        ),
      );
      setActiveEdgeIds([]);
    },
    [edges],
  );

  const runFlow = useCallback(async () => {
    if (isRunningFlow) return;
    setIsRunningFlow(true);
    setNodes((current) =>
      current.map((node) => ({ ...node, data: { ...node.data, status: "idle" as const } })),
    );
    try {
      const sorted = topologicalSort(nodes, edges);
      for (const node of sorted) {
        await simulateRunNode(node.id);
      }
      notify.success("Demo flow finished — create an account to generate for real.");
    } finally {
      setIsRunningFlow(false);
      setActiveEdgeIds([]);
    }
  }, [edges, isRunningFlow, nodes, simulateRunNode]);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      panRef.current = { startX: clientX, startY: clientY, originX: pan.x, originY: pan.y };
      setIsPanning(true);
    },
    [pan.x, pan.y],
  );

  const handleDragStart = useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      if (spacePanRef.current) {
        event.preventDefault();
        startPan(event.clientX, event.clientY);
        return;
      }

      const node = nodes.find((item) => item.id === nodeId);
      const canvas = canvasRef.current;
      if (!node || !canvas) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const point = canvasPointFromEvent(event, canvas, zoom, pan);
      dragRef.current = { id: nodeId, offsetX: point.x - node.x, offsetY: point.y - node.y };
      setDraggingNodeId(nodeId);
      setSelectedId(nodeId);

      const flushDrag = () => {
        rafRef.current = null;
        const pending = pendingDragRef.current;
        if (!pending) return;
        setNodes((current) =>
          current.map((item) =>
            item.id === pending.id ? { ...item, x: pending.x, y: pending.y } : item,
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
        if (!rafRef.current) rafRef.current = window.requestAnimationFrame(flushDrag);
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
              item.id === pending.id ? { ...item, x: pending.x, y: pending.y } : item,
            ),
          );
        }
        dragRef.current = null;
        pendingDragRef.current = null;
        setDraggingNodeId(null);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [nodes, pan, startPan, zoom],
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const onBackground = isCanvasBackgroundTarget(event.target);

      if (
        event.button === 1 ||
        (event.button === 0 && event.altKey) ||
        (event.button === 0 && spacePanRef.current)
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
          setPan({ x: pending.originX + dx, y: pending.originY + dy });
        };

        const onPointerUp = () => {
          if (pendingPanRef.current) {
            if (!expandedRef.current) {
              setExpanded(true);
            } else {
              setSelectedId(null);
            }
          }
          pendingPanRef.current = null;
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        return;
      }

      if (event.button === 0) setSelectedId(null);
    },
    [startPan],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
        event.preventDefault();
        spacePanRef.current = true;
        setSpacePan(true);
      }
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
  }, []);

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
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isPanning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button")) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;

      setZoom((currentZoom) => {
        const nextZoom = clampZoom(currentZoom * zoomFactor);
        const scale = nextZoom / currentZoom;
        setPan((currentPan) => ({
          x: pointerX - (pointerX - currentPan.x) * scale,
          y: pointerY - (pointerY - currentPan.y) * scale,
        }));
        return nextZoom;
      });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const canvasCursor = isPanning || spacePan ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-grab";

  const panel = (
    <div
      className={cn(
        "group flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-zinc-200/80 bg-[#fcfcfc] shadow-[0_24px_64px_rgba(15,23,42,0.12)] ring-1 ring-violet-200/50 md:rounded-[2rem]",
        expanded ? "h-full" : "landing-hover-lift w-full",
      )}
      role="region"
      aria-label={expanded ? "Studio Pro demo expanded" : "Studio Pro interactive demo"}
    >
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-100 bg-white/90 px-3 backdrop-blur-md sm:h-12 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-900 ring-1 ring-purple-100">
            <Workflow className="h-3 w-3 text-purple-700" />
            Studio Pro
            <span className="rounded-full bg-violet-600 px-1.5 py-px text-[8px] font-semibold text-white">Demo</span>
          </span>
          <span className="hidden text-zinc-300 sm:inline">/</span>
          <span className="hidden text-[10px] text-zinc-400 sm:inline">Sessions</span>
          <span className="hidden text-zinc-300 sm:inline">/</span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-zinc-900 sm:text-xs">{DEMO_FLOW_NAME}</p>
            <p className="text-[9px] text-zinc-500">Preview · not saved</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1.5 md:flex">
            <div className="flex -space-x-1.5">
              {[
                { initials: "AK", color: "#7c3aed" },
                { initials: "JM", color: "#db2777" },
              ].map((person) => (
                <span
                  key={person.initials}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-semibold text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {person.initials}
                </span>
              ))}
            </div>
            <span className="text-[9px] text-zinc-400">Sample teammates</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 sm:inline-flex"
            onClick={() => demoSignupHint("use undo history")}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isRunningFlow}
            className="h-7 gap-1 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
            onClick={() => void runFlow()}
          >
            <Zap className="h-3 w-3" />
            {isRunningFlow ? "Running…" : "Run all"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-7 gap-1 px-2 text-[10px] sm:inline-flex sm:h-8"
            onClick={() => demoSignupHint("share sessions")}
          >
            <Share2 className="h-3 w-3" />
            Share
          </Button>
          {expanded ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
              onClick={collapseDemo}
              aria-label="Close expanded demo"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
              onClick={expandDemo}
              aria-label="Expand demo"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      <div className={cn("flex flex-1", expanded ? EXPANDED_CANVAS_MIN_H : COLLAPSED_CANVAS_MIN_H)}>
        <div
          ref={canvasRef}
          data-studio-demo-bg
          className={cn("relative min-w-0 flex-1 touch-none overflow-hidden", canvasCursor)}
          onPointerDown={handleCanvasPointerDown}
        >
          <div
            data-studio-demo-bg
            className="absolute inset-0 bg-zinc-50/90"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(161,161,170,0.35) 1px, transparent 1px)",
              backgroundSize: `${18 * zoom}px ${18 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          <div
            data-studio-demo-bg
            className="absolute inset-0 origin-top-left will-change-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <DemoConnections nodes={nodes} edges={edges} activeEdgeIds={activeEdgeIds} />

            {nodes.map((node) => (
              <DemoNodeCard
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                dragging={draggingNodeId === node.id}
                hasIncoming={incomingByTarget.has(node.id)}
                onSelect={() => setSelectedId(node.id)}
                onDragStart={(event) => handleDragStart(node.id, event)}
                onRunNode={() => void simulateRunNode(node.id)}
                isRunningFlow={isRunningFlow}
              >
                {renderNodeBody(node)}
              </DemoNodeCard>
            ))}
          </div>

          <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-200/80 bg-white/90 px-2.5 py-1 text-[9px] font-medium text-violet-800 shadow-sm backdrop-blur-sm sm:text-[10px]">
              {expanded
                ? "Drag nodes · scroll to zoom · Space + drag to pan · Esc to exit"
                : "Click empty canvas to expand · drag nodes · scroll to zoom"}
            </span>
            {!expanded ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  expandDemo();
                }}
                className="pointer-events-auto flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/90 px-2 py-1 text-[9px] text-zinc-600 shadow-sm backdrop-blur-sm transition hover:border-violet-200 hover:text-violet-700"
              >
                <Maximize2 className="h-3 w-3" />
                Expand
              </button>
            ) : null}
          </div>

          <div
            className="pointer-events-auto absolute bottom-16 left-1/2 z-20 -translate-x-1/2 sm:bottom-[4.5rem]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="studio-toolbar flex items-center gap-0.5 rounded-xl border border-zinc-100 bg-white p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <ToolbarIconButton icon={Plus} label="Add text" onClick={() => demoSignupHint("add nodes")} />
              <ToolbarIconButton icon={FolderOpen} label="Assets" onClick={() => demoSignupHint("upload assets")} />
              <ToolbarIconButton icon={Settings2} label="Settings" onClick={() => demoSignupHint("open settings")} />
              <span className="mx-0.5 h-5 w-px bg-zinc-100" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-9 text-center text-[9px] text-zinc-500">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div
            className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-1 px-2 sm:bottom-5"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {(["prompt", "image", "video"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => demoSignupHint(`add ${type} nodes`)}
                className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[8px] capitalize text-zinc-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700 sm:text-[9px]"
              >
                + {type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => demoSignupHint("use templates")}
              className="rounded-full border border-purple-100 bg-purple-50 px-2 py-1 text-[8px] text-purple-700 transition hover:bg-purple-100 sm:text-[9px]"
            >
              Templates
            </button>
          </div>
        </div>

        <DemoInspector node={selectedNode} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-white/80 px-3 py-2 sm:px-4">
        <p className="text-[9px] text-zinc-500 sm:text-[10px]">
          Interactive preview — flows are not saved here.
        </p>
        <Button asChild size="sm" variant="outline" className="h-7 rounded-full text-[10px] sm:h-8">
          <Link href="/signup">Get Studio Pro</Link>
        </Button>
      </div>
    </div>
  );

  if (expanded && portalReady) {
    return (
      <>
        <div className={cn("w-full", COLLAPSED_CANVAS_MIN_H)} aria-hidden />
        {createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col p-3 sm:p-4 md:p-6">
            <button
              type="button"
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]"
              onClick={collapseDemo}
              aria-label="Close expanded demo"
            />
            <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col">
              {panel}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return <div className="w-full">{panel}</div>;
}

function ToolbarIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
