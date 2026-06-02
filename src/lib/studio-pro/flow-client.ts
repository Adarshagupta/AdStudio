import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";
import type { StudioViewport } from "@/lib/studio-pro/flows";

export type StudioFlowSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioFlowRecord = StudioFlowSummary & {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

export async function createStudioFlowSession(name?: string) {
  const response = await fetch("/api/studio/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const data = (await response.json()) as { id?: string; error?: string };
  if (!response.ok || !data.id) {
    throw new Error(data.error ?? "Could not create Studio Pro session.");
  }

  return data.id;
}

export async function fetchStudioFlow(flowId: string) {
  const response = await fetch(`/api/studio/flows/${flowId}`);
  const data = (await response.json()) as StudioFlowRecord & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load Studio Pro session.");
  }

  return data;
}

export async function saveStudioFlow(
  flowId: string,
  payload: {
    name?: string;
    nodes?: StudioNode[];
    edges?: StudioEdge[];
    viewport?: StudioViewport;
  },
  options?: { keepalive?: boolean },
) {
  const response = await fetch(`/api/studio/flows/${flowId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: options?.keepalive ?? false,
  });

  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Could not save Studio Pro session.");
  }
}
