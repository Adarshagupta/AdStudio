"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  agentChatFingerprint,
  isRemoteAgentChatNewer,
  type StudioAgentChatSyncPayload,
} from "@/lib/studio-pro/agent-sessions";
import {
  broadcastStudioAgentLive,
  broadcastStudioFlowLive,
  fetchStudioFlow,
  saveStudioFlow,
} from "@/lib/studio-pro/flow-client";
import {
  studioRealtimeBaseUrl,
  studioRealtimeEnabled,
  studioRealtimeWebSocketUrl,
} from "@/lib/studio-pro/realtime-client";
import {
  isRemoteRevisionStale,
  parseRevisionTime,
  studioFlowFingerprint,
  type StudioFlowSyncState,
} from "@/lib/studio-pro/sync-fingerprint";
import type { StudioSyncPayload, StudioPresencePayload } from "@/lib/studio-pro/realtime-types";

const LIVE_THROTTLE_MS = 40;
const LIVE_DEBOUNCE_MS = 64;
const OUTBOUND_SUPPRESS_MS = 120;
const POLL_INTERVAL_MS = 1200;
const SSE_RECONNECT_MS = 1500;
const WS_RECONNECT_MS = 1200;
const WS_TOKEN_REFRESH_MS = 240_000;

export type StudioCollaborator = {
  clientId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type RealtimeEnvelope =
  | { type: "hello"; presence: StudioPresencePayload[] }
  | { type: "sync"; payload: StudioSyncPayload }
  | { type: "agent_chat"; payload: StudioAgentChatSyncPayload }
  | { type: "presence"; payload: StudioPresencePayload }
  | { type: "presence_leave"; payload: { clientId: string } };

function createClientId() {
  if (typeof window === "undefined") return "server";
  const key = "studio-client-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `c_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export type StudioFlowLiveState = StudioFlowSyncState;

export function useStudioCollaboration({
  sessionId,
  enabled = true,
  baselineUpdatedAt,
  collaborator,
  getLiveState,
  onRemoteSync,
  onRemoteAgentChat,
}: {
  sessionId: string;
  enabled?: boolean;
  baselineUpdatedAt?: string;
  collaborator?: {
    userId: string;
    name: string;
  };
  getLiveState: () => StudioFlowLiveState;
  onRemoteSync: (payload: StudioSyncPayload) => void;
  onRemoteAgentChat?: (payload: StudioAgentChatSyncPayload) => void;
}) {
  const clientId = useMemo(() => createClientId(), []);
  const [peers, setPeers] = useState<StudioCollaborator[]>([]);
  const [connection, setConnection] = useState<"connecting" | "live" | "polling" | "offline">("connecting");
  const lastAppliedRemoteRef = useRef<string | null>(null);
  const lastPublishedAtRef = useRef<string | null>(baselineUpdatedAt ?? null);
  const lastBroadcastFingerprintRef = useRef<string | null>(null);
  const lastBroadcastAgentFingerprintRef = useRef<string | null>(null);
  const lastAppliedAgentChatRef = useRef<string | null>(null);
  const suppressOutboundUntilRef = useRef(0);
  const onRemoteSyncRef = useRef(onRemoteSync);
  const onRemoteAgentChatRef = useRef(onRemoteAgentChat);
  const getLiveStateRef = useRef(getLiveState);
  const broadcastTimerRef = useRef<number | null>(null);
  const lastBroadcastAtRef = useRef(0);
  const broadcastInFlightRef = useRef(false);
  const broadcastQueuedRef = useRef(false);
  const remoteGenerationRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  onRemoteSyncRef.current = onRemoteSync;
  onRemoteAgentChatRef.current = onRemoteAgentChat;
  getLiveStateRef.current = getLiveState;

  const pauseOutboundSync = useCallback((durationMs = OUTBOUND_SUPPRESS_MS) => {
    remoteGenerationRef.current += 1;
    suppressOutboundUntilRef.current = Date.now() + durationMs;
    if (broadcastTimerRef.current) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
  }, []);

  const applySync = useCallback(
    (payload: StudioSyncPayload) => {
      if (payload.clientId === clientId) return;
      if (lastAppliedRemoteRef.current === payload.updatedAt) return;

      const incoming = parseRevisionTime(payload.updatedAt);
      const lastApplied = lastAppliedRemoteRef.current
        ? parseRevisionTime(lastAppliedRemoteRef.current)
        : 0;
      if (incoming <= lastApplied) return;

      const local = getLiveStateRef.current();
      const remoteState = {
        nodes: payload.nodes,
        edges: payload.edges,
        viewport: payload.viewport,
      };

      if (studioFlowFingerprint(local) === studioFlowFingerprint(remoteState)) {
        lastAppliedRemoteRef.current = payload.updatedAt;
        return;
      }

      if (payload.clientId === "poll") {
        if (
          isRemoteRevisionStale(
            payload.updatedAt,
            lastAppliedRemoteRef.current,
            lastPublishedAtRef.current,
          )
        ) {
          return;
        }
      } else if (payload.nodes.length === 0 && local.nodes.length > 0) {
        const published = lastPublishedAtRef.current
          ? parseRevisionTime(lastPublishedAtRef.current)
          : 0;
        if (incoming > published) {
          return;
        }
      }

      pauseOutboundSync();
      lastAppliedRemoteRef.current = payload.updatedAt;
      onRemoteSyncRef.current(payload);
    },
    [clientId, pauseOutboundSync],
  );

  const applyAgentChat = useCallback(
    (payload: StudioAgentChatSyncPayload) => {
      if (payload.clientId === clientId) return;
      if (lastAppliedAgentChatRef.current === payload.updatedAt) return;
      if (!isRemoteAgentChatNewer(payload.updatedAt, lastAppliedAgentChatRef.current)) return;

      pauseOutboundSync();
      lastAppliedAgentChatRef.current = payload.updatedAt;
      onRemoteAgentChatRef.current?.(payload);
    },
    [clientId, pauseOutboundSync],
  );

  const markLocalAgentChatApplied = useCallback((updatedAt: string) => {
    if (!updatedAt) return;
    lastAppliedAgentChatRef.current = updatedAt;
    lastBroadcastAgentFingerprintRef.current = null;
  }, []);

  const sendAgentChatOverSocket = useCallback((payload: StudioAgentChatSyncPayload) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !wsReadyRef.current) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type: "agent_chat",
        agentChat: {
          messages: payload.messages,
          requestHistory: payload.requestHistory,
          updatedAt: payload.updatedAt,
        },
        updatedAt: payload.updatedAt,
      }),
    );
    return true;
  }, []);

  const sendLiveSyncOverSocket = useCallback(
    (state: StudioFlowLiveState) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !wsReadyRef.current) {
        return null;
      }

      const updatedAt = new Date().toISOString();
      socket.send(
        JSON.stringify({
          type: "sync",
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          updatedAt,
        }),
      );
      return updatedAt;
    },
    [],
  );

  const pushLiveBroadcast = useCallback(async () => {
    if (!enabled) return;

    if (Date.now() < suppressOutboundUntilRef.current) {
      broadcastQueuedRef.current = false;
      return;
    }

    if (broadcastInFlightRef.current) {
      broadcastQueuedRef.current = true;
      return;
    }

    const state = getLiveStateRef.current();
    const fingerprint = studioFlowFingerprint(state);
    if (fingerprint === lastBroadcastFingerprintRef.current) {
      return;
    }

    broadcastInFlightRef.current = true;
    broadcastQueuedRef.current = false;
    const generationAtStart = remoteGenerationRef.current;

    try {
      const socketUpdatedAt = sendLiveSyncOverSocket(state);
      if (socketUpdatedAt) {
        lastBroadcastFingerprintRef.current = fingerprint;
        return;
      }

      const updatedAt = await broadcastStudioFlowLive(sessionId, state, clientId);
      if (updatedAt) {
        lastBroadcastFingerprintRef.current = fingerprint;
      }
    } catch {
      try {
        const updatedAt = await saveStudioFlow(sessionId, state, { clientId });
        if (updatedAt) {
          lastPublishedAtRef.current = updatedAt;
          lastBroadcastFingerprintRef.current = fingerprint;
        }
      } catch {
        // Autosave will retry persistence.
      }
    } finally {
      broadcastInFlightRef.current = false;

      if (generationAtStart !== remoteGenerationRef.current) {
        broadcastQueuedRef.current = false;
        void pushLiveBroadcast();
        return;
      }

      if (
        broadcastQueuedRef.current &&
        Date.now() >= suppressOutboundUntilRef.current
      ) {
        void pushLiveBroadcast();
      } else {
        broadcastQueuedRef.current = false;
      }
    }
  }, [clientId, enabled, sendLiveSyncOverSocket, sessionId]);

  const pushLivePersist = useCallback(async () => {
    if (!enabled) return;

    if (broadcastTimerRef.current) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }

    const state = getLiveStateRef.current();
    const fingerprint = studioFlowFingerprint(state);

    try {
      const updatedAt = await saveStudioFlow(sessionId, state, { clientId });
      if (updatedAt) {
        lastPublishedAtRef.current = updatedAt;
        lastBroadcastFingerprintRef.current = fingerprint;
      }
    } catch {
      // Autosave flush will retry persistence.
    }
  }, [clientId, enabled, sessionId]);

  const scheduleLiveSync = useCallback(() => {
    if (!enabled) return;
    if (Date.now() < suppressOutboundUntilRef.current) return;

    const now = Date.now();
    const sinceLast = now - lastBroadcastAtRef.current;

    const run = () => {
      lastBroadcastAtRef.current = Date.now();
      void pushLiveBroadcast();
    };

    if (sinceLast >= LIVE_THROTTLE_MS) {
      if (broadcastTimerRef.current) {
        window.clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      run();
      return;
    }

    if (broadcastTimerRef.current) {
      window.clearTimeout(broadcastTimerRef.current);
    }

    broadcastTimerRef.current = window.setTimeout(() => {
      broadcastTimerRef.current = null;
      run();
    }, Math.max(LIVE_DEBOUNCE_MS - sinceLast, 16));
  }, [enabled, pushLiveBroadcast]);

  const flushLiveSync = useCallback(async () => {
    await pushLivePersist();
    if (Date.now() >= suppressOutboundUntilRef.current) {
      await pushLiveBroadcast();
    }
  }, [pushLiveBroadcast, pushLivePersist]);

  const broadcastAgentLive = useCallback(
    async (agentChat: StudioAgentChatSyncPayload) => {
      if (!enabled) return;

      const fingerprint = agentChatFingerprint(agentChat);
      if (fingerprint === lastBroadcastAgentFingerprintRef.current) {
        return;
      }

      if (Date.now() < suppressOutboundUntilRef.current) {
        return;
      }

      if (sendAgentChatOverSocket(agentChat)) {
        lastBroadcastAgentFingerprintRef.current = fingerprint;
        return;
      }

      try {
        await broadcastStudioAgentLive(sessionId, { agentChat }, clientId);
        lastBroadcastAgentFingerprintRef.current = fingerprint;
      } catch {
        // Agent autosave will retry persistence.
      }
    },
    [clientId, enabled, sendAgentChatOverSocket, sessionId],
  );

  const reportPresence = useCallback(
    (point: { x: number; y: number }) => {
      if (!enabled || !collaborator) return;

      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && wsReadyRef.current) {
        socket.send(JSON.stringify({ type: "presence", x: point.x, y: point.y }));
        return;
      }

      void fetch(`/api/studio/flows/${sessionId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, x: point.x, y: point.y }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [clientId, collaborator, enabled, sessionId],
  );

  const leavePresence = useCallback(() => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave" }));
      socket.close();
      return;
    }

    void fetch(`/api/studio/flows/${sessionId}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, x: 0, y: 0, leave: true }),
      keepalive: true,
    }).catch(() => undefined);
  }, [clientId, sessionId]);

  useEffect(() => {
    if (!enabled) {
      setConnection("offline");
      return;
    }

    let disposed = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
    let source: EventSource | null = null;
    let socket: WebSocket | null = null;
    let sseFailures = 0;
    let wsFailures = 0;
    const useCloudflareRealtime = studioRealtimeEnabled();

    const stopPolling = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const startPolling = () => {
      if (pollTimer || disposed) return;
      setConnection("polling");

      const poll = async () => {
        try {
          const flow = await fetchStudioFlow(sessionId);
          if (disposed) return;

          applySync({
            updatedAt: flow.updatedAt,
            clientId: "poll",
            userId: "poll",
            name: "Teammate",
            nodes: flow.nodes,
            edges: flow.edges,
            viewport: flow.viewport,
          });

          if (flow.agentChat?.updatedAt) {
            applyAgentChat({
              ...flow.agentChat,
              clientId: "poll",
              userId: "poll",
              name: "Teammate",
            });
          }
        } catch {
          // Ignore polling errors.
        }
      };

      void poll();
      pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    };

    const handleEnvelope = (payload: RealtimeEnvelope) => {
      if (payload.type === "hello") {
        setPeers(
          payload.presence
            .filter((entry) => entry.clientId !== clientId)
            .map((entry) => ({
              clientId: entry.clientId,
              userId: entry.userId,
              name: entry.name,
              color: entry.color,
              x: entry.x,
              y: entry.y,
            })),
        );
        return;
      }

      if (payload.type === "sync") {
        applySync(payload.payload);
        return;
      }

      if (payload.type === "agent_chat") {
        applyAgentChat(payload.payload);
        return;
      }

      if (payload.type === "presence") {
        if (payload.payload.clientId === clientId) return;
        setPeers((current) => {
          const next = current.filter((peer) => peer.clientId !== payload.payload.clientId);
          next.push({
            clientId: payload.payload.clientId,
            userId: payload.payload.userId,
            name: payload.payload.name,
            color: payload.payload.color,
            x: payload.payload.x,
            y: payload.payload.y,
          });
          return next;
        });
        return;
      }

      if (payload.type === "presence_leave") {
        setPeers((current) => current.filter((peer) => peer.clientId !== payload.payload.clientId));
      }
    };

    const connectSse = () => {
      if (disposed) return;

      source?.close();
      source = new EventSource(`/api/studio/flows/${sessionId}/realtime`);

      source.onopen = () => {
        if (disposed) return;
        sseFailures = 0;
        stopPolling();
        setConnection("live");
      };

      source.onmessage = (event) => {
        if (disposed) return;

        try {
          handleEnvelope(JSON.parse(event.data) as RealtimeEnvelope);
        } catch {
          // Ignore malformed events.
        }
      };

      source.onerror = () => {
        if (disposed) return;
        source?.close();
        source = null;
        sseFailures += 1;

        if (sseFailures >= 2) {
          startPolling();
        }

        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!disposed) connectSse();
        }, SSE_RECONNECT_MS);
      };
    };

    const fetchRealtimeToken = async () => {
      const response = await fetch(
        `/api/studio/flows/${sessionId}/realtime-token?clientId=${encodeURIComponent(clientId)}`,
      );
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        throw new Error(data.error ?? "Could not fetch realtime token.");
      }
      return data.token;
    };

    const connectWebSocket = async () => {
      if (disposed || !useCloudflareRealtime) return;

      wsReadyRef.current = false;
      socket?.close();
      socket = null;
      wsRef.current = null;

      try {
        const baseUrl = studioRealtimeBaseUrl();
        const token = await fetchRealtimeToken();
        if (disposed) return;

        const wsUrl = studioRealtimeWebSocketUrl(baseUrl, sessionId, token, clientId);
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (disposed) return;
          wsFailures = 0;
          wsReadyRef.current = true;
          stopPolling();
          setConnection("live");
        };

        socket.onmessage = (event) => {
          if (disposed) return;
          try {
            handleEnvelope(JSON.parse(event.data as string) as RealtimeEnvelope);
          } catch {
            // Ignore malformed events.
          }
        };

        socket.onclose = () => {
          wsReadyRef.current = false;
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          if (disposed) return;

          wsFailures += 1;
          if (wsFailures >= 2) {
            startPolling();
          }

          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            void connectWebSocket();
          }, WS_RECONNECT_MS);
        };

        socket.onerror = () => {
          wsReadyRef.current = false;
        };
      } catch {
        wsReadyRef.current = false;
        if (!disposed) {
          connectSse();
        }
      }
    };

    if (useCloudflareRealtime) {
      void connectWebSocket();
      tokenRefreshTimer = setInterval(() => {
        if (!disposed) {
          void connectWebSocket();
        }
      }, WS_TOKEN_REFRESH_MS);
    } else {
      connectSse();
    }

    return () => {
      disposed = true;
      wsReadyRef.current = false;
      socket?.close();
      wsRef.current = null;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
      if (broadcastTimerRef.current) {
        window.clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      leavePresence();
    };
  }, [applyAgentChat, applySync, clientId, enabled, leavePresence, sessionId]);

  const uniqueCollaborators = useMemo(() => {
    const byUser = new Map<string, StudioCollaborator>();
    for (const peer of peers) {
      if (!byUser.has(peer.userId)) byUser.set(peer.userId, peer);
    }
    return Array.from(byUser.values());
  }, [peers]);

  return {
    clientId,
    peers,
    uniqueCollaborators,
    connection,
    reportPresence,
    leavePresence,
    scheduleLiveSync,
    flushLiveSync,
    broadcastAgentLive,
    pauseOutboundSync,
    markLocalAgentChatApplied,
  };
}
