"use client";

import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import { buildEdgePath, buildPreviewPath } from "@/lib/studio-pro/graph";
import { cn } from "@/lib/utils";

export function StudioConnectionLayer({
  nodes,
  edges,
  activeEdgeIds,
  flashEdgeIds,
  selectedEdgeId,
  connectingFrom,
  connectPreview,
  snapTargetId,
  onEdgeSelect,
  onEdgeRemove,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  activeEdgeIds: string[];
  flashEdgeIds: string[];
  selectedEdgeId: string | null;
  connectingFrom: string | null;
  connectPreview: { x: number; y: number } | null;
  snapTargetId: string | null;
  onEdgeSelect: (edgeId: string) => void;
  onEdgeRemove: (edgeId: string) => void;
}) {
  const source = connectingFrom ? nodes.find((node) => node.id === connectingFrom) : null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-[2400px] w-[2400px] overflow-visible">
      <defs>
        <linearGradient id="studio-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.25)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.85)" />
        </linearGradient>
      </defs>

      {edges.map((edge) => {
        const from = nodes.find((node) => node.id === edge.source);
        const to = nodes.find((node) => node.id === edge.target);
        if (!from || !to) return null;

        const path = buildEdgePath(from, to);
        const isActive = activeEdgeIds.includes(edge.id);
        const isFlashing = flashEdgeIds.includes(edge.id);
        const isSelected = selectedEdgeId === edge.id;
        const stroke =
          isSelected || isActive || isFlashing ? "url(#studio-edge-gradient)" : "rgba(161,161,170,0.55)";
        const strokeWidth = isSelected ? 3.5 : isActive || isFlashing ? 3 : 2;

        return (
          <g key={edge.id} className="pointer-events-auto">
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              strokeLinecap="round"
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.stopPropagation();
                onEdgeSelect(edge.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onEdgeRemove(edge.id);
              }}
            />
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={cn(
                "pointer-events-none",
                (isActive || isFlashing) && "studio-edge-flow",
                isSelected && "drop-shadow-[0_0_6px_rgba(124,58,237,0.35)]",
              )}
            />
            {isActive ? (
              <path
                d={path}
                fill="none"
                stroke="rgba(124,58,237,0.35)"
                strokeWidth="3"
                strokeDasharray="8 10"
                strokeLinecap="round"
                className="pointer-events-none studio-edge-flow"
              />
            ) : null}
          </g>
        );
      })}

      {source && connectPreview ? (
        <>
          <path
            d={buildPreviewPath(source, connectPreview)}
            fill="none"
            stroke={snapTargetId ? "rgba(124,58,237,0.95)" : "rgba(124,58,237,0.55)"}
            strokeWidth={snapTargetId ? 3 : 2}
            strokeDasharray={snapTargetId ? "0" : "6 8"}
            strokeLinecap="round"
            className={cn(!snapTargetId && "studio-edge-preview")}
          />
          <circle
            cx={connectPreview.x}
            cy={connectPreview.y}
            r={snapTargetId ? 6 : 4}
            fill={snapTargetId ? "rgba(124,58,237,0.9)" : "rgba(124,58,237,0.5)"}
          />
        </>
      ) : null}
    </svg>
  );
}
