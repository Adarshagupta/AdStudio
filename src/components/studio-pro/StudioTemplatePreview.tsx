"use client";

import { useMemo } from "react";
import { CalendarClock, FileText, Image as ImageIcon, Music2, Share2, UserRound, Video } from "lucide-react";

import { buildEdgePath } from "@/lib/studio-pro/graph";
import type { StudioEdge, StudioNode, StudioNodeType } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";
import { cn } from "@/lib/utils";

const icons: Record<StudioNodeType, typeof FileText> = {
  prompt: FileText,
  character: UserRound,
  image: ImageIcon,
  audio: Music2,
  video: Video,
  schedule: CalendarClock,
  social: Share2,
};

const typeAccent: Record<StudioNodeType, string> = {
  prompt: "from-violet-500/20 to-violet-500/5",
  character: "from-pink-500/20 to-pink-500/5",
  image: "from-sky-500/20 to-sky-500/5",
  audio: "from-amber-500/20 to-amber-500/5",
  video: "from-emerald-500/20 to-emerald-500/5",
  schedule: "from-rose-500/20 to-rose-500/5",
  social: "from-orange-500/20 to-orange-500/5",
};

function PreviewNode({ node }: { node: StudioNode }) {
  const Icon = icons[node.type];
  const height = getNodeHeight(node);
  const promptPreview = node.data.prompt?.trim() || node.title;

  return (
    <div
      className="absolute rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height,
        zIndex: node.zIndex ?? 0,
      }}
    >
      <div className={cn("h-1 rounded-t-xl bg-gradient-to-r", typeAccent[node.type])} />
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{node.title}</p>
          <p className="truncate text-[10px] text-zinc-500">{node.subtitle}</p>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-3 text-[11px] leading-4 text-zinc-600 dark:text-zinc-400">
          {promptPreview}
        </p>
      </div>
    </div>
  );
}

function boundsForNodes(nodes: StudioNode[]) {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 280 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const height = getNodeHeight(node);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + height);
  }

  return { minX, minY, maxX, maxY };
}

export function StudioTemplatePreview({
  nodes,
  edges,
  className,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  className?: string;
}) {
  const layout = useMemo(() => {
    const bounds = boundsForNodes(nodes);
    const padding = 24;
    const width = Math.max(320, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(220, bounds.maxY - bounds.minY + padding * 2);
    const offsetX = padding - bounds.minX;
    const offsetY = padding - bounds.minY;

    const positionedNodes = nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    }));

    const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

    return { width, height, positionedNodes, nodeById };
  }, [nodes]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.25)_1px,transparent_0)] [background-size:16px_16px] dark:border-zinc-800",
        className,
      )}
      style={{ minHeight: layout.height }}
    >
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {edges.map((edge) => {
            const source = layout.nodeById.get(edge.source);
            const target = layout.nodeById.get(edge.target);
            if (!source || !target) return null;
            const path = buildEdgePath(source, target);
            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-purple-300 dark:text-purple-700"
              />
            );
          })}
        </svg>
        {layout.positionedNodes.map((node) => (
          <PreviewNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
