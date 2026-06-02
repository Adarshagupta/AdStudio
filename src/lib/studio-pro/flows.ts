import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export type StudioViewport = {
  zoom: number;
  pan: { x: number; y: number };
  ui?: {
    templatePickerDismissed?: boolean;
  };
};

export type StudioFlowSnapshot = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

const defaultViewport: StudioViewport = { zoom: 0.9, pan: { x: 0, y: 0 } };

export function normalizeFlowNodes(nodes: StudioNode[]): StudioNode[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      status: node.data.status === "running" ? "idle" : node.data.status,
    },
  }));
}

export function parseFlowSnapshot(
  nodes: Prisma.JsonValue,
  edges: Prisma.JsonValue,
  viewport: Prisma.JsonValue,
): StudioFlowSnapshot {
  const parsedNodes = Array.isArray(nodes) ? (nodes as StudioNode[]) : [];
  const parsedEdges = Array.isArray(edges) ? (edges as StudioEdge[]) : [];
  const parsedViewport =
    viewport && typeof viewport === "object" && !Array.isArray(viewport)
      ? (viewport as StudioViewport)
      : defaultViewport;

  return {
    nodes: normalizeFlowNodes(parsedNodes),
    edges: parsedEdges,
    viewport: {
      zoom: typeof parsedViewport.zoom === "number" ? parsedViewport.zoom : defaultViewport.zoom,
      pan: {
        x: typeof parsedViewport.pan?.x === "number" ? parsedViewport.pan.x : 0,
        y: typeof parsedViewport.pan?.y === "number" ? parsedViewport.pan.y : 0,
      },
      ui:
        parsedViewport.ui && typeof parsedViewport.ui === "object"
          ? {
              templatePickerDismissed: Boolean(parsedViewport.ui.templatePickerDismissed),
            }
          : undefined,
    },
  };
}

export async function createStudioFlow(workspaceId: string, userId: string, name?: string) {
  return prisma.studioFlow.create({
    data: {
      workspaceId,
      userId,
      name: name?.trim() || "Untitled flow",
      nodes: [],
      edges: [],
      viewport: defaultViewport,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getStudioFlowForUser(flowId: string, workspaceId: string) {
  return prisma.studioFlow.findFirst({
    where: { id: flowId, workspaceId },
  });
}

export async function listStudioFlows(workspaceId: string, limit = 20) {
  return prisma.studioFlow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      updatedAt: true,
      createdAt: true,
    },
  });
}

export async function updateStudioFlow(
  flowId: string,
  workspaceId: string,
  data: {
    name?: string;
    nodes?: StudioNode[];
    edges?: StudioEdge[];
    viewport?: StudioViewport;
  },
) {
  return prisma.studioFlow.updateMany({
    where: { id: flowId, workspaceId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() || "Untitled flow" } : {}),
      ...(data.nodes !== undefined ? { nodes: normalizeFlowNodes(data.nodes) as Prisma.InputJsonValue } : {}),
      ...(data.edges !== undefined ? { edges: data.edges as Prisma.InputJsonValue } : {}),
      ...(data.viewport !== undefined ? { viewport: data.viewport as Prisma.InputJsonValue } : {}),
    },
  });
}
