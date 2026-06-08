"use client";

import { MousePointer2 } from "lucide-react";

import type { StudioCollaborator } from "@/hooks/useStudioCollaboration";

export function StudioRemoteCursors({
  peers,
  zoom,
  pan,
}: {
  peers: StudioCollaborator[];
  zoom: number;
  pan: { x: number; y: number };
}) {
  return (
    <>
      {peers.map((peer) => (
        <div
          key={peer.clientId}
          className="pointer-events-none absolute z-40 will-change-transform"
          style={{
            transform: `translate(${pan.x + peer.x * zoom}px, ${pan.y + peer.y * zoom}px)`,
          }}
        >
          <MousePointer2
            className="h-4 w-4 drop-shadow"
            style={{ color: peer.color, fill: peer.color }}
          />
          <span
            className="ml-3 -mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
            style={{ backgroundColor: peer.color }}
          >
            {peer.name}
          </span>
        </div>
      ))}
    </>
  );
}
