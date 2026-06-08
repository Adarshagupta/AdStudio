import { formatValidationErrors, readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import type { StudioAgentChatSnapshot } from "@/lib/studio-pro/agent-sessions";
import type { StudioViewport } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

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
  agentChat: StudioAgentChatSnapshot;
};

export async function createStudioFlowSession(name?: string) {
  const response = await fetch("/api/studio/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const data = await readJsonResponse<{ id?: string; error?: string }>(response);
  if (!response.ok || !data.id) {
    throw new Error(responseErrorMessage(response, data, "Could not create Studio Pro session."));
  }

  return data.id;
}

export async function fetchStudioFlow(flowId: string) {
  const response = await fetch(`/api/studio/flows/${flowId}`);
  const data = await readJsonResponse<StudioFlowRecord & { error?: string }>(response);

  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Could not load Studio Pro session."));
  }

  return data;
}

export function isStudioFlowFetchError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

export async function saveStudioFlow(
  flowId: string,
  payload: {
    name?: string;
    nodes?: StudioNode[];
    edges?: StudioEdge[];
    viewport?: StudioViewport;
    agentChat?: StudioAgentChatSnapshot;
  },
  options?: { keepalive?: boolean; clientId?: string },
) {
  let response: Response;
  try {
    response = await fetch(`/api/studio/flows/${flowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...(options?.clientId ? { clientId: options.clientId } : {}),
      }),
      keepalive: options?.keepalive ?? false,
    });
  } catch (error) {
    if (isStudioFlowFetchError(error)) {
      throw new Error("Could not reach the server to save. Check your connection and try again.");
    }
    throw error;
  }

  const data = await readJsonResponse<{
    ok?: boolean;
    updatedAt?: string;
    error?: string;
    errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  }>(response);
  if (!response.ok) {
    throw new Error(
      data.error ??
        formatValidationErrors(
          data.errors ?? {},
          responseErrorMessage(response, data, "Could not save Studio Pro session."),
        ),
    );
  }

  return data.updatedAt;
}

export async function broadcastStudioAgentLive(
  flowId: string,
  payload: {
    agentChat: StudioAgentChatSnapshot;
  },
  clientId: string,
) {
  const response = await fetch(`/api/studio/flows/${flowId}/agent-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, clientId }),
  });

  const data = await readJsonResponse<{ ok?: boolean; updatedAt?: string; error?: string }>(response);
  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Could not broadcast live agent update."));
  }

  return data.updatedAt;
}

/** Ephemeral canvas sync — publishes over SSE/Redis without a DB write. */
export async function broadcastStudioFlowLive(
  flowId: string,
  payload: {
    nodes: StudioNode[];
    edges: StudioEdge[];
    viewport: StudioViewport;
  },
  clientId: string,
) {
  const response = await fetch(`/api/studio/flows/${flowId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, clientId }),
  });

  const data = await readJsonResponse<{ ok?: boolean; updatedAt?: string; error?: string }>(response);
  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Could not broadcast live canvas update."));
  }

  return data.updatedAt;
}
