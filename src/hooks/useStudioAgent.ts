"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import { notify } from "@/lib/notify";
import type { StudioAgentBrandContext } from "@/lib/studio-pro/agent-brand-context";
import { buildRunAllPlan } from "@/lib/studio-pro/agent-layout";
import { expandNodeReferences, isUndoCommand } from "@/lib/studio-pro/agent-message-parse";
import { resolvePublishToolPayload } from "@/lib/studio-pro/agent-social";
import type { AgentToolCall } from "@/lib/studio-pro/agent-tools";
import { executeAgentTool, type StudioAgentActions } from "@/lib/studio-pro/agent-executor";
import { cloneCanvasSnapshot } from "@/lib/studio-pro/agent-undo";
import type { AgentRuntimeBridge } from "@/lib/studio-pro/agent-runtime-bridge";
import { sanitizeFlowMemory } from "@/lib/studio-pro/agent-memory";
import { consumeAgentStream, type AgentStreamResult } from "@/lib/studio-pro/agent-stream";
import { polishAgentReply, shouldStreamAgentReply } from "@/lib/studio-pro/agent-system";
import {
  agentChatFingerprint,
  buildAgentChatSnapshot,
  clearLegacyLocalAgentSession,
  isRemoteAgentChatNewer,
  loadLegacyLocalAgentSession,
  trimAgentRequestHistory,
  type StudioAgentChatSnapshot,
  type StudioAgentChatSyncPayload,
  type StudioAgentMessage,
  type StudioAgentRequestMessage,
} from "@/lib/studio-pro/agent-sessions";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const MAX_AGENT_ROUNDS = 100;
const AGENT_SAVE_DEBOUNCE_MS = 600;
const AGENT_LIVE_THROTTLE_MS = 120;

export type { StudioAgentMessage };

export type StudioAgentRunApproval = {
  plan: string;
  toolName: "run_all" | "publish_to_social";
};

export type StudioAgentCollaboration = {
  initialAgentChat: StudioAgentChatSnapshot;
  clientId: string;
  saveAgentChat: (chat: StudioAgentChatSnapshot) => Promise<string | undefined>;
  broadcastAgentLive: (chat: StudioAgentChatSnapshot) => Promise<void>;
  pauseOutboundSync: () => void;
  onLocalAgentChatApplied?: (updatedAt: string) => void;
};

type AgentApiResponse = AgentStreamResult & { error?: string };

function newId() {
  return crypto.randomUUID();
}

export function useStudioAgent(
  flowId: string,
  actions: StudioAgentActions,
  collaboration: StudioAgentCollaboration,
  brandContext?: StudioAgentBrandContext | null,
  runtimeBridge?: MutableRefObject<AgentRuntimeBridge>,
) {
  const [messages, setMessages] = useState<StudioAgentMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<StudioAgentRunApproval | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const requestHistoryRef = useRef<StudioAgentRequestMessage[]>([]);
  const messagesRef = useRef<StudioAgentMessage[]>([]);
  const actionsRef = useRef(actions);
  const streamMessageIdRef = useRef<string | null>(null);
  const savedFingerprintRef = useRef(agentChatFingerprint(collaboration.initialAgentChat));
  const lastUpdatedAtRef = useRef(collaboration.initialAgentChat.updatedAt);
  const hydratedFlowIdRef = useRef<string | null>(null);
  const isBusyRef = useRef(false);
  const lastUserTextRef = useRef("");
  const saveTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const lastLiveAtRef = useRef(0);
  const collaborationRef = useRef(collaboration);
  const brandContextRef = useRef(brandContext ?? null);
  const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null);
  actionsRef.current = actions;
  collaborationRef.current = collaboration;
  brandContextRef.current = brandContext ?? null;
  messagesRef.current = messages;
  isBusyRef.current = isBusy;

  const persistAgentChat = useCallback(async (options?: { keepalive?: boolean; silent?: boolean }) => {
    const snapshot = buildAgentChatSnapshot({
      messages: messagesRef.current,
      requestHistory: requestHistoryRef.current,
      memory: runtimeBridge?.current.memory,
    });
    const fingerprint = agentChatFingerprint(snapshot);
    if (fingerprint === savedFingerprintRef.current) {
      return true;
    }

    try {
      const updatedAt = await collaborationRef.current.saveAgentChat(snapshot);
      const appliedAt = snapshot.updatedAt;
      lastUpdatedAtRef.current = appliedAt;
      savedFingerprintRef.current = fingerprint;
      collaborationRef.current.onLocalAgentChatApplied?.(appliedAt);
      if (updatedAt) {
        // Flow row timestamp may differ from agentChat.updatedAt; local chat version uses appliedAt.
      }
      return true;
    } catch (error) {
      if (!options?.silent) {
        notify.error(error instanceof Error ? error.message : "Could not save agent chat.");
      }
      return false;
    }
  }, []);

  const pushAgentLive = useCallback(async () => {
    if (Date.now() < lastLiveAtRef.current + AGENT_LIVE_THROTTLE_MS) return;

    const snapshot = buildAgentChatSnapshot({
      messages: messagesRef.current,
      requestHistory: requestHistoryRef.current,
      memory: runtimeBridge?.current.memory,
      updatedAt: lastUpdatedAtRef.current || undefined,
    });

    lastLiveAtRef.current = Date.now();
    try {
      await collaborationRef.current.broadcastAgentLive(snapshot);
    } catch {
      // Autosave will persist to DB.
    }
  }, []);

  const scheduleAgentPersist = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void persistAgentChat();
    }, AGENT_SAVE_DEBOUNCE_MS);

    if (liveTimerRef.current) {
      window.clearTimeout(liveTimerRef.current);
    }

    liveTimerRef.current = window.setTimeout(() => {
      liveTimerRef.current = null;
      void pushAgentLive();
    }, AGENT_LIVE_THROTTLE_MS);
  }, [persistAgentChat, pushAgentLive]);

  const flushAgentPersist = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (liveTimerRef.current) {
      window.clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    await persistAgentChat();
    await pushAgentLive();
  }, [persistAgentChat, pushAgentLive]);

  useEffect(() => {
    if (hydratedFlowIdRef.current === flowId) return;

    let chat = collaboration.initialAgentChat;
    const legacy = loadLegacyLocalAgentSession(flowId);

    if (legacy && chat.messages.length === 0 && chat.requestHistory.length === 0) {
      chat = legacy;
      void collaborationRef.current.saveAgentChat(chat).then(() => {
        lastUpdatedAtRef.current = chat.updatedAt;
        collaborationRef.current.onLocalAgentChatApplied?.(chat.updatedAt);
        clearLegacyLocalAgentSession(flowId);
      });
    }

    hydratedFlowIdRef.current = flowId;
    setMessages(chat.messages);
    requestHistoryRef.current = chat.requestHistory;
    if (runtimeBridge) {
      runtimeBridge.current.memory = sanitizeFlowMemory(chat.memory);
    }
    lastUpdatedAtRef.current = chat.updatedAt;
    savedFingerprintRef.current = agentChatFingerprint(chat);
    streamMessageIdRef.current = null;
    setActivity(null);
    setCanUndo(Boolean(runtimeBridge?.current.undoSnapshot));
    setHydrated(true);
  }, [collaboration.initialAgentChat, flowId, runtimeBridge]);

  useEffect(() => {
    if (!hydrated) return;
    scheduleAgentPersist();
  }, [hydrated, messages, scheduleAgentPersist]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current);
      void persistAgentChat({ keepalive: true, silent: true });
    };
  }, [persistAgentChat]);

  const applyRemoteAgentChat = useCallback((payload: StudioAgentChatSyncPayload) => {
    if (payload.clientId === collaborationRef.current.clientId) return;
    if (isBusyRef.current) return;
    if (!isRemoteAgentChatNewer(payload.updatedAt, lastUpdatedAtRef.current)) return;

    collaborationRef.current.pauseOutboundSync();
    setMessages(payload.messages);
    requestHistoryRef.current = payload.requestHistory;
    if (runtimeBridge) {
      runtimeBridge.current.memory = sanitizeFlowMemory(payload.memory);
    }
    lastUpdatedAtRef.current = payload.updatedAt;
    savedFingerprintRef.current = agentChatFingerprint(payload);
    streamMessageIdRef.current = null;
  }, []);

  const appendMessage = useCallback((message: StudioAgentMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const startThinkingBubble = useCallback(() => {
    if (streamMessageIdRef.current) return;

    const id = newId();
    streamMessageIdRef.current = id;
    setMessages((current) => [
      ...current,
      { id, role: "assistant", content: "", streaming: true },
    ]);
  }, []);

  const upsertStreamingAssistant = useCallback((delta: string) => {
    if (!shouldStreamAgentReply(lastUserTextRef.current)) return;

    setActivity(null);
    const streamId = streamMessageIdRef.current;
    if (!streamId) {
      const id = newId();
      streamMessageIdRef.current = id;
      setMessages((current) => [
        ...current,
        { id, role: "assistant", content: delta, streaming: true },
      ]);
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === streamId && message.role === "assistant"
          ? { ...message, content: message.content + delta, streaming: true }
          : message,
      ),
    );
  }, []);

  const clearEmptyStream = useCallback(() => {
    const streamId = streamMessageIdRef.current;
    if (!streamId) return;

    setMessages((current) => {
      const streamMessage = current.find((message) => message.id === streamId);
      if (streamMessage?.role === "assistant" && !streamMessage.content.trim()) {
        return current.filter((message) => message.id !== streamId);
      }
      return current;
    });
    streamMessageIdRef.current = null;
  }, []);

  const removeShortStreamBubble = useCallback(() => {
    const streamId = streamMessageIdRef.current;
    if (!streamId) return;

    setMessages((current) => {
      const streamMessage = current.find((message) => message.id === streamId);
      if (
        streamMessage?.role === "assistant" &&
        streamMessage.content.trim().length < 12 &&
        !/[.!?]$/.test(streamMessage.content.trim())
      ) {
        return current.filter((message) => message.id !== streamId);
      }
      return current;
    });
    streamMessageIdRef.current = null;
  }, []);

  const finishAssistantText = useCallback(
    (content: string | null | undefined) => {
      const trimmed = content?.trim();
      const streamId = streamMessageIdRef.current;

      if (!trimmed) {
        clearEmptyStream();
        return;
      }

      if (streamId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === streamId && message.role === "assistant"
              ? { ...message, content: trimmed, streaming: false }
              : message,
          ),
        );
        streamMessageIdRef.current = null;
        return;
      }

      appendMessage({
        id: newId(),
        role: "assistant",
        content: trimmed,
      });
    },
    [appendMessage, clearEmptyStream],
  );

  const finalizeStreamingAssistant = useCallback(() => {
    const streamId = streamMessageIdRef.current;
    if (!streamId) return;

    setMessages((current) =>
      current.map((message) =>
        message.id === streamId && message.role === "assistant"
          ? { ...message, streaming: false }
          : message,
      ),
    );
    streamMessageIdRef.current = null;
  }, []);

  const markUndoAvailable = useCallback(
    (available: boolean) => {
      setCanUndo(available);
      runtimeBridge?.current.onUndoAvailableChange?.(available);
    },
    [runtimeBridge],
  );

  const saveUndoSnapshot = useCallback(() => {
    if (!runtimeBridge) return;
    const state = actionsRef.current.getState();
    runtimeBridge.current.undoSnapshot = cloneCanvasSnapshot(state.nodes, state.edges, "agent");
    markUndoAvailable(true);
  }, [markUndoAvailable, runtimeBridge]);

  const performUndo = useCallback(async () => {
    const snapshot = actionsRef.current.popUndoSnapshot();
    if (!snapshot) {
      notify.error("Nothing to undo.");
      markUndoAvailable(false);
      return false;
    }
    actionsRef.current.restoreCanvasSnapshot(snapshot);
    await actionsRef.current.flushSave();
    markUndoAvailable(false);
    appendMessage({
      id: newId(),
      role: "assistant",
      content: "Reverted the canvas to before my last changes.",
    });
    return true;
  }, [appendMessage, markUndoAvailable]);

  const callAgent = useCallback(async (nodes: StudioNode[], edges: StudioEdge[]) => {
    startThinkingBubble();
    setActivity(null);

    const brandContext = brandContextRef.current;
    const flowMemory = runtimeBridge?.current.memory;
    const collabContext = actionsRef.current.getCollabContext();

    const response = await fetch("/api/studio/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: trimAgentRequestHistory(requestHistoryRef.current),
        nodes,
        edges,
        ...(brandContext ? { brandContext } : {}),
        ...(flowMemory ? { flowMemory } : {}),
        ...(collabContext ? { collabContext } : {}),
        stream: true,
      }),
    });

    return consumeAgentStream(response, {
      onDelta: (content) => upsertStreamingAssistant(content),
      onError: () => setActivity(null),
    }) as Promise<AgentApiResponse>;
  }, [startThinkingBubble, upsertStreamingAssistant]);

  const requestAgentApproval = useCallback(
    (plan: string, toolName: StudioAgentRunApproval["toolName"]) =>
      new Promise<boolean>((resolve) => {
        approvalResolverRef.current = resolve;
        setPendingApproval({ plan, toolName });
      }),
    [],
  );

  const resolveRunApproval = useCallback((approved: boolean) => {
    approvalResolverRef.current?.(approved);
    approvalResolverRef.current = null;
    setPendingApproval(null);
  }, []);

  const runToolRound = useCallback(
    async (toolCalls: AgentToolCall[]) => {
      const toolResults: Array<{ id: string; content: string }> = [];
      const readOnlyTools = new Set([
        "review_flow",
        "list_assets",
        "list_connected_social",
        "undo_last_action",
        "remember_flow",
        "publish_to_social",
      ]);
      const hasUndoable = toolCalls.some((call) => !readOnlyTools.has(call.name));
      if (hasUndoable) {
        saveUndoSnapshot();
      }

      for (const call of toolCalls) {
        const pendingId = newId();
        appendMessage({
          id: pendingId,
          role: "tool",
          toolName: call.name,
          content: "…",
          pending: true,
        });
        setActivity(null);

        let result;
        if (call.name === "run_all") {
          const state = actionsRef.current.getState();
          const plan = buildRunAllPlan(
            state.nodes,
            state.edges,
            runtimeBridge?.current.creditsRemaining,
          );
          const approved = await requestAgentApproval(plan, "run_all");
          if (!approved) {
            result = { ok: false, message: "Run cancelled — approve the plan to run the full pipeline." };
          } else {
            result = await executeAgentTool(call, actionsRef.current);
          }
        } else if (call.name === "publish_to_social") {
          const state = actionsRef.current.getState();
          const payload = resolvePublishToolPayload(call.arguments, state.nodes);
          if (!payload.ok) {
            result = { ok: false, message: payload.message };
          } else {
            const dryRunResponse = await fetch("/api/studio/social", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                providers: payload.providers,
                mediaUrl: payload.mediaUrl,
                mediaType: payload.mediaType,
                caption: payload.caption,
                subreddit: payload.subreddit,
                dryRun: true,
              }),
            });
            const dryRun = (await dryRunResponse.json()) as { plan?: string };
            const plan =
              dryRun.plan ??
              `Publish ${payload.mediaType} to connected social channels.`;
            const approved = await requestAgentApproval(plan, "publish_to_social");
            if (!approved) {
              result = {
                ok: false,
                message: "Publish cancelled — approve to post to social media.",
              };
            } else {
              result = await executeAgentTool(call, actionsRef.current);
            }
          }
        } else {
          result = await executeAgentTool(call, actionsRef.current);
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId && message.role === "tool"
              ? {
                  ...message,
                  content: result.message,
                  pending: false,
                  outputText: result.outputText,
                  imageUrl: result.imageUrl,
                  videoUrl: result.videoUrl,
                  audioUrl: result.audioUrl,
                  nodeId: result.nodeId,
                }
              : message,
          ),
        );

        toolResults.push({
          id: call.id,
          content: JSON.stringify({
            ok: result.ok,
            message: result.message,
            nodeId: result.nodeId,
            outputText: result.outputText?.slice(0, 1_500),
            imageUrl: result.imageUrl,
            videoUrl: result.videoUrl,
            audioUrl: result.audioUrl,
          }),
        });

        if (call.name === "remember_flow" && result.ok) {
          void persistAgentChat({ silent: true });
        }
        if (call.name === "undo_last_action") {
          markUndoAvailable(false);
        }
      }

      for (const result of toolResults) {
        requestHistoryRef.current.push({
          role: "tool",
          tool_call_id: result.id,
          content: result.content,
        });
      }

      const latest = actionsRef.current.getState();
      return callAgent(latest.nodes, latest.edges);
    },
    [
      appendMessage,
      callAgent,
      markUndoAvailable,
      persistAgentChat,
      requestAgentApproval,
      runtimeBridge,
      saveUndoSnapshot,
    ],
  );

  const handleAgentResponse = useCallback(
    async (response: AgentApiResponse) => {
      const toolCalls = response.toolCalls ?? [];

      if (toolCalls.length === 0) {
        const polished = polishAgentReply(lastUserTextRef.current, response.content);
        finishAssistantText(polished);

        if (response.rawToolCalls?.length) {
          requestHistoryRef.current.push({
            role: "assistant",
            content: polished,
            tool_calls: response.rawToolCalls,
          });
        } else if (polished) {
          requestHistoryRef.current.push({
            role: "assistant",
            content: polished,
          });
        }

        return null;
      }

      if (streamMessageIdRef.current) {
        removeShortStreamBubble();
        if (streamMessageIdRef.current) {
          finalizeStreamingAssistant();
        }
      } else {
        clearEmptyStream();
      }

      requestHistoryRef.current.push({
        role: "assistant",
        content: response.content ?? null,
        tool_calls:
          response.rawToolCalls ??
          toolCalls.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          })),
      });

      return runToolRound(toolCalls);
    },
    [clearEmptyStream, finalizeStreamingAssistant, finishAssistantText, removeShortStreamBubble, runToolRound],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;

      if (isUndoCommand(trimmed)) {
        setIsBusy(true);
        await performUndo();
        await flushAgentPersist();
        setIsBusy(false);
        return;
      }

      setIsBusy(true);
      setActivity(null);

      const state = actionsRef.current.getState();
      const { text: expandedText, focusNodeIds } = expandNodeReferences(trimmed, state.nodes);
      for (const nodeId of focusNodeIds) {
        actionsRef.current.focusNode(nodeId);
      }

      lastUserTextRef.current = expandedText;
      const userMessage = { id: newId(), role: "user" as const, content: trimmed };
      appendMessage(userMessage);
      requestHistoryRef.current.push({ role: "user", content: expandedText });
      messagesRef.current = [...messagesRef.current, userMessage];
      void persistAgentChat({ silent: true });
      void pushAgentLive();

      try {
        let round = 0;
        let response = await callAgent(
          actionsRef.current.getState().nodes,
          actionsRef.current.getState().edges,
        );

        while (round < MAX_AGENT_ROUNDS) {
          const next = await handleAgentResponse(response);
          if (!next) break;
          response = next;
          round += 1;
        }

        if (round >= MAX_AGENT_ROUNDS) {
          notify.error(`Agent reached the step limit (${MAX_AGENT_ROUNDS} rounds). Try a smaller request or break it into steps.`);
        }

        await flushAgentPersist();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Studio agent failed.";
        notify.error(message);
        finalizeStreamingAssistant();
        appendMessage({ id: newId(), role: "assistant", content: `Error: ${message}` });
        await flushAgentPersist();
      } finally {
        setActivity(null);
        setIsBusy(false);
      }
    },
    [
      appendMessage,
      callAgent,
      finalizeStreamingAssistant,
      flushAgentPersist,
      handleAgentResponse,
      isBusy,
      performUndo,
      persistAgentChat,
      pushAgentLive,
    ],
  );

  const undoLastAction = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    await performUndo();
    await flushAgentPersist();
    setIsBusy(false);
  }, [flushAgentPersist, isBusy, performUndo]);

  const clearMessages = useCallback(() => {
    const empty = buildAgentChatSnapshot({
      messages: [],
      requestHistory: [],
      memory: runtimeBridge?.current.memory,
    });
    setMessages([]);
    requestHistoryRef.current = [];
    lastUpdatedAtRef.current = empty.updatedAt;
    savedFingerprintRef.current = agentChatFingerprint(empty);
    streamMessageIdRef.current = null;
    setActivity(null);
    clearLegacyLocalAgentSession(flowId);
    void collaborationRef.current.saveAgentChat(empty);
    void collaborationRef.current.broadcastAgentLive(empty);
  }, [flowId, runtimeBridge]);

  return {
    messages,
    isBusy,
    activity,
    hydrated,
    pendingApproval,
    canUndo,
    sendMessage,
    clearMessages,
    undoLastAction,
    applyRemoteAgentChat,
    resolveRunApproval,
  };
}
