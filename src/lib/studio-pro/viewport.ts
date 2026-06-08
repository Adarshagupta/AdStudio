import type { StudioNode } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";

export function fitViewportToNodes(
  nodes: StudioNode[],
  canvasWidth: number,
  canvasHeight: number,
  padding = 56,
) {
  if (nodes.length === 0 || canvasWidth < 80 || canvasHeight < 80) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + getNodeHeight(node));
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const zoom = Math.min(
    1.2,
    Math.max(
      0.6,
      Math.min((canvasWidth - padding * 2) / contentWidth, (canvasHeight - padding * 2) / contentHeight),
    ),
  );

  return {
    zoom: Number(zoom.toFixed(2)),
    pan: {
      x: Number((canvasWidth / 2 - centerX * zoom).toFixed(1)),
      y: Number((canvasHeight / 2 - centerY * zoom).toFixed(1)),
    },
  };
}

export function isNodeVisibleInViewport(
  node: StudioNode,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  pan: { x: number; y: number },
  margin = 80,
) {
  const left = node.x * zoom + pan.x;
  const top = node.y * zoom + pan.y;
  const width = node.width * zoom;
  const height = getNodeHeight(node) * zoom;

  return (
    left + width > -margin &&
    top + height > -margin &&
    left < canvasWidth + margin &&
    top < canvasHeight + margin
  );
}

export function anyNodeVisible(
  nodes: StudioNode[],
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  pan: { x: number; y: number },
) {
  return nodes.some((node) => isNodeVisibleInViewport(node, canvasWidth, canvasHeight, zoom, pan));
}
