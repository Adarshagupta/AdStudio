import type { Prisma } from "@prisma/client";

import { sanitizeFlowMemory, type StudioAgentFlowMemory } from "@/lib/studio-pro/agent-memory";

export type StudioAgentToolMessage = {
  id: string;
  role: "tool";
  content: string;
  toolName: string;
  pending?: boolean;
  outputText?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  nodeId?: string;
};

export type StudioAgentMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; streaming?: boolean }
  | StudioAgentToolMessage;

export type StudioAgentRequestMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type StudioAgentChatSnapshot = {
  messages: StudioAgentMessage[];
  requestHistory: StudioAgentRequestMessage[];
  memory?: StudioAgentFlowMemory;
  updatedAt: string;
};

export type { StudioAgentFlowMemory };

export type StudioAgentChatSyncPayload = StudioAgentChatSnapshot & {
  clientId: string;
  userId: string;
  name: string;
};

const MAX_MESSAGES = 80;
const MAX_REQUEST_HISTORY = 48;

export function trimAgentRequestHistory(messages: StudioAgentRequestMessage[], max = MAX_REQUEST_HISTORY) {
  if (messages.length <= max) return messages;

  const [first, ...rest] = messages;
  if (first?.role !== "user") {
    return messages.slice(-max);
  }

  return [first, ...rest.slice(-(max - 1))];
}
const STORAGE_VERSION = "v1";

export const emptyAgentChatSnapshot = (): StudioAgentChatSnapshot => ({
  messages: [],
  requestHistory: [],
  memory: { preferences: {} },
  updatedAt: "",
});

const sessionKey = (flowId: string) => `studio-agent-session-${STORAGE_VERSION}-${flowId}`;

export function sanitizeAgentMessages(messages: StudioAgentMessage[]): StudioAgentMessage[] {
  return messages
    .filter(
      (message) =>
        !(message.role === "assistant" && message.streaming) &&
        !(message.role === "tool" && message.pending),
    )
    .slice(-MAX_MESSAGES)
    .map((message) => {
      if (message.role === "assistant") {
        return { ...message, streaming: undefined };
      }
      if (message.role === "tool") {
        const toolMessage = message as StudioAgentToolMessage;
        return {
          ...toolMessage,
          pending: undefined,
          outputText: toolMessage.outputText,
          imageUrl: toolMessage.imageUrl,
          videoUrl: toolMessage.videoUrl,
          audioUrl: toolMessage.audioUrl,
          nodeId: toolMessage.nodeId,
        };
      }
      return message;
    });
}

export function sanitizeAgentChatSnapshot(
  input: Partial<StudioAgentChatSnapshot> | null | undefined,
): StudioAgentChatSnapshot {
  if (!input) return emptyAgentChatSnapshot();

  return {
    messages: sanitizeAgentMessages(Array.isArray(input.messages) ? input.messages : []),
    requestHistory: Array.isArray(input.requestHistory)
      ? input.requestHistory.slice(-MAX_REQUEST_HISTORY)
      : [],
    memory: sanitizeFlowMemory(input.memory),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
  };
}

export function parseAgentChatSnapshot(value: Prisma.JsonValue | null | undefined): StudioAgentChatSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyAgentChatSnapshot();
  }

  const record = value as Partial<StudioAgentChatSnapshot>;
  return sanitizeAgentChatSnapshot(record);
}

export function buildAgentChatSnapshot(input: {
  messages: StudioAgentMessage[];
  requestHistory: StudioAgentRequestMessage[];
  memory?: StudioAgentFlowMemory;
  updatedAt?: string;
}): StudioAgentChatSnapshot {
  return sanitizeAgentChatSnapshot({
    messages: input.messages,
    requestHistory: input.requestHistory,
    memory: input.memory,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
}

export function agentChatFingerprint(snapshot: StudioAgentChatSnapshot) {
  return JSON.stringify({
    messages: snapshot.messages,
    requestHistory: snapshot.requestHistory,
    memory: snapshot.memory,
  });
}

export function isRemoteAgentChatNewer(
  incomingUpdatedAt: string,
  localUpdatedAt: string | null | undefined,
) {
  const incoming = Date.parse(incomingUpdatedAt);
  const local = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
  if (Number.isNaN(incoming)) return false;
  if (Number.isNaN(local)) return Boolean(incomingUpdatedAt);
  return incoming > local;
}

/** One-time migration from legacy browser storage after DB field ships. */
export function loadLegacyLocalAgentSession(flowId: string): StudioAgentChatSnapshot | null {
  if (typeof window === "undefined" || !flowId) return null;

  try {
    const raw = localStorage.getItem(sessionKey(flowId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      messages?: StudioAgentMessage[];
      requestHistory?: StudioAgentRequestMessage[];
      updatedAt?: number;
    };

    if (!Array.isArray(parsed.messages) || !Array.isArray(parsed.requestHistory)) {
      return null;
    }

    return buildAgentChatSnapshot({
      messages: parsed.messages,
      requestHistory: parsed.requestHistory,
      updatedAt: parsed.updatedAt
        ? new Date(parsed.updatedAt).toISOString()
        : new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

export function clearLegacyLocalAgentSession(flowId: string) {
  if (typeof window === "undefined" || !flowId) return;
  localStorage.removeItem(sessionKey(flowId));
}
