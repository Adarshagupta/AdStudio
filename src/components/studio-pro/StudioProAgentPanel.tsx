"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, ImageIcon, Loader2, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
import {
  useStudioAgent,
  type StudioAgentCollaboration,
  type StudioAgentMessage,
} from "@/hooks/useStudioAgent";
import { mergeBrandContext, type StudioAgentBrandContext } from "@/lib/studio-pro/agent-brand-context";
import type { AgentRuntimeBridge } from "@/lib/studio-pro/agent-runtime-bridge";
import type { StudioAgentChatSyncPayload, StudioAgentToolMessage } from "@/lib/studio-pro/agent-sessions";
import {
  parseLegacyToolMessage,
  shouldShowAgentToolOutputText,
} from "@/lib/studio-pro/agent-tool-result";
import { agentToolLabel } from "@/lib/studio-pro/agent-stream";
import {
  formatAgentChatText,
  STUDIO_AGENT_STARTERS,
  STUDIO_AGENT_WELCOME,
} from "@/lib/studio-pro/agent-system";
import type { StudioAgentActions } from "@/lib/studio-pro/agent-executor";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";

function AgentToolOutput({ message }: { message: StudioAgentToolMessage }) {
  const legacy = parseLegacyToolMessage(message.toolName, message.content);
  const imageUrl = message.imageUrl ?? legacy.imageUrl;
  const videoUrl = message.videoUrl ?? legacy.videoUrl;
  const audioUrl = message.audioUrl ?? legacy.audioUrl;
  const outputText = message.outputText ?? legacy.outputText;
  const showOutputText = shouldShowAgentToolOutputText(outputText, { imageUrl, videoUrl, audioUrl });
  const isMediaRun =
    message.toolName === "run_node" ||
    message.toolName === "run_all" ||
    message.toolName === "iterate_node";

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
      <div className="flex items-center gap-2">
        {message.pending ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-400" /> : null}
        <span className="font-medium text-foreground dark:text-zinc-200">{agentToolLabel(message.toolName)}</span>
        {message.nodeId ? (
          <span className="truncate text-[10px] text-zinc-400">{message.nodeId}</span>
        ) : null}
      </div>
      {!message.pending ? (
        <div className="mt-1.5 space-y-2">
          <p className="leading-5 text-zinc-600">{message.content}</p>
          {showOutputText ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-900">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {isMediaRun
                  ? "Generated output"
                  : message.toolName === "review_flow"
                    ? "Review"
                    : message.toolName === "publish_to_social" ||
                        message.toolName === "list_connected_social"
                      ? "Social"
                      : "Content"}
              </p>
              <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-[1.5] text-foreground dark:text-zinc-200">
                {outputText}
              </pre>
            </div>
          ) : null}
          {imageUrl ? (
            <div className="space-y-1">
              {isMediaRun ? (
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Generated image
                </p>
              ) : null}
              <img
                src={imageUrl}
                alt="Generated image"
                className="max-h-40 w-full rounded-lg border border-border object-contain bg-background"
              />
            </div>
          ) : null}
          {videoUrl ? (
            <div className="space-y-1">
              {isMediaRun ? (
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Generated video
                </p>
              ) : null}
              <video
                src={videoUrl}
                controls
                className="max-h-40 w-full rounded-lg border border-zinc-200 bg-black"
              />
            </div>
          ) : null}
          {audioUrl ? (
            <audio src={audioUrl} controls className="w-full" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AgentMessage({ message }: { message: StudioAgentMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] rounded-2xl rounded-br-md bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "tool") {
    return <AgentToolOutput message={message} />;
  }

  const thinking = message.streaming && !message.content.trim();
  const displayText = message.content ? formatAgentChatText(message.content) : "";

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none">
        {thinking ? (
          <span className="inline-flex items-center gap-1 py-0.5" aria-label="Thinking">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{displayText}</p>
        )}
        {message.streaming && message.content ? (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-400 align-middle" />
        ) : null}
      </div>
    </div>
  );
}

export function StudioProAgentPanel({
  flowId,
  workspaceId,
  actions,
  collaboration,
  agentRuntimeRef,
  applyRemoteAgentChatRef,
  autoStartPrompt,
  onAutoStartPromptConsumed,
  onClose,
}: {
  flowId: string;
  workspaceId?: string;
  actions: StudioAgentActions;
  collaboration: StudioAgentCollaboration;
  agentRuntimeRef: React.MutableRefObject<AgentRuntimeBridge>;
  applyRemoteAgentChatRef: React.MutableRefObject<(payload: StudioAgentChatSyncPayload) => void>;
  autoStartPrompt?: string | null;
  onAutoStartPromptConsumed?: () => void;
  onClose: () => void;
}) {
  const [remoteBrand, setRemoteBrand] = useState<Partial<StudioAgentBrandContext>>({});
  const [brandDraft, setBrandDraft] = useState<Partial<StudioAgentBrandContext>>({});
  const [brandOpen, setBrandOpen] = useState(false);
  const brandSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;
    void fetch("/api/studio/agent-context")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const loaded = {
          workspaceName: typeof data.workspaceName === "string" ? data.workspaceName : undefined,
          companyName: typeof data.companyName === "string" ? data.companyName : undefined,
          brandTone: typeof data.brandTone === "string" ? data.brandTone : undefined,
          targetAudience: typeof data.targetAudience === "string" ? data.targetAudience : undefined,
          defaultAspectRatio:
            typeof data.defaultAspectRatio === "string" ? data.defaultAspectRatio : undefined,
        };
        setRemoteBrand(loaded);
        setBrandDraft(loaded);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const brandContext = useMemo(
    () => mergeBrandContext(remoteBrand, brandDraft),
    [brandDraft, remoteBrand],
  );

  const scheduleBrandSave = (patch: Partial<StudioAgentBrandContext>) => {
    if (!workspaceId) return;
    setBrandDraft((current) => {
      const next = { ...current, ...patch };
      if (brandSaveTimerRef.current) window.clearTimeout(brandSaveTimerRef.current);
      brandSaveTimerRef.current = window.setTimeout(() => {
        void fetch("/api/studio/agent-context", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandTone: next.brandTone,
            targetAudience: next.targetAudience,
            defaultAspectRatio: next.defaultAspectRatio,
          }),
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!data) return;
            setRemoteBrand({
              workspaceName: data.workspaceName,
              companyName: data.companyName,
              brandTone: data.brandTone,
              targetAudience: data.targetAudience,
              defaultAspectRatio: data.defaultAspectRatio,
            });
          })
          .catch(() => undefined);
      }, 500);
      return next;
    });
  };

  const {
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
  } = useStudioAgent(flowId, actions, collaboration, brandContext, agentRuntimeRef);

  useEffect(() => {
    applyRemoteAgentChatRef.current = applyRemoteAgentChat;
    return () => {
      applyRemoteAgentChatRef.current = () => undefined;
    };
  }, [applyRemoteAgentChat, applyRemoteAgentChatRef]);

  const autoStartRef = useRef<string | null>(null);

  useEffect(() => {
    const prompt = autoStartPrompt?.trim();
    if (!prompt || !hydrated || isBusy) return;
    if (autoStartRef.current === prompt) return;

    autoStartRef.current = prompt;
    onAutoStartPromptConsumed?.();
    void sendMessage(prompt);
  }, [autoStartPrompt, hydrated, isBusy, onAutoStartPromptConsumed, sendMessage]);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
    const frame = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frame);
  }, [messages, isBusy, activity, hydrated, pendingApproval, scrollToBottom]);

  const submit = () => {
    const text = draft.trim();
    if (!text || isBusy) return;
    setDraft("");
    void sendMessage(text);
  };

  return (
    <aside className="studio-agent flex h-full w-full min-w-0 flex-col bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Agent</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Build & run flows for you</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void undoLastAction()}
            disabled={!canUndo || isBusy}
            aria-label="Undo last agent change"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearMessages}
            disabled={messages.length === 0 || isBusy}
            aria-label="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close agent">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {pendingApproval ? (
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
          <p className="text-xs font-medium text-foreground">
            {pendingApproval.toolName === "publish_to_social"
              ? "Approve social publish"
              : "Approve pipeline run"}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">{pendingApproval.plan}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => resolveRunApproval(true)}>
              {pendingApproval.toolName === "publish_to_social" ? "Publish now" : "Run pipeline"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => resolveRunApproval(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!hydrated ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading chat…
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none">
                {STUDIO_AGENT_WELCOME}
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-muted/40 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="mb-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Try asking</p>
              </div>
              <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                Describe an ad, script, or video — I&apos;ll add nodes, wire the flow, and run generation for you.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Try</p>
              {STUDIO_AGENT_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void sendMessage(starter)}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs leading-5 text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <AgentMessage key={message.id} message={message} />)
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-100 p-3 dark:border-zinc-800">
        {workspaceId ? (
          <div className="mb-2 rounded-lg border border-zinc-100 bg-muted/40 dark:border-zinc-700 dark:bg-zinc-800/50">
            <button
              type="button"
              onClick={() => setBrandOpen((open) => !open)}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
            >
              <span>Brand context</span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${brandOpen ? "rotate-180" : ""}`} />
            </button>
            {brandOpen ? (
              <div className="space-y-2 border-t border-zinc-100 px-2.5 py-2 dark:border-zinc-700">
                {remoteBrand.companyName || remoteBrand.workspaceName ? (
                  <p className="text-[10px] text-zinc-500">
                    {[remoteBrand.companyName, remoteBrand.workspaceName].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                <input
                  value={brandDraft.brandTone ?? ""}
                  onChange={(event) => scheduleBrandSave({ brandTone: event.target.value })}
                  placeholder="Tone (e.g. playful, premium)"
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <input
                  value={brandDraft.targetAudience ?? ""}
                  onChange={(event) => scheduleBrandSave({ targetAudience: event.target.value })}
                  placeholder="Audience (e.g. Gen Z skincare)"
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <input
                  value={brandDraft.defaultAspectRatio ?? ""}
                  onChange={(event) => scheduleBrandSave({ defaultAspectRatio: event.target.value })}
                  placeholder="Default ratio (e.g. 9:16)"
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <p className="text-[10px] text-zinc-400">Saved to workspace for your whole team.</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Say hi, @prompt-abc a node, or ask me to build something…"
            rows={3}
            disabled={isBusy}
            className="min-h-[72px] resize-none pr-24 text-sm"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <MediaUploadTrigger
              kinds={["image", "video", "audio"]}
              onFile={async (file) => {
                const text = `Upload file "${file.name}" and attach it to the appropriate node.`;
                setDraft(text);
                await sendMessage(text);
                setDraft("");
              }}
              onAsset={(asset: UserMediaAssetDto) => {
                const text = `Attach asset ID "${asset.id}" to the appropriate node. Asset name: ${asset.name ?? asset.id}, kind: ${asset.kind}.`;
                setDraft(text);
                void sendMessage(text);
                setDraft("");
              }}
              trigger={({ open, disabled: triggerDisabled }) => (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={open}
                  disabled={triggerDisabled || isBusy}
                  aria-label="Attach asset"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              )}
            />
            <Button
              size="icon"
              className="h-8 w-8"
              onClick={submit}
              disabled={!draft.trim() || isBusy}
              aria-label="Send"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
