"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Clapperboard,
  Film,
  ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Video,
  VideoIcon,
  Wand2,
  X,
  Zap,
} from "lucide-react";

import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  CHAT_STARTER_PROMPTS,
  CHAT_TOOL_OPTIONS,
  clearDashboardChatLaunch,
  launchFromSearchParams,
  readDashboardChatLaunch,
  type ChatAttachment,
  type ChatMessage,
  type ChatToolMode,
  type AgentStep,
  inferToolMode,
  toolModeLabel,
  validateChatPrompt,
} from "@/lib/dashboard-chat";
import {
  fetchGenerationStatus,
  isInsufficientCreditsError,
  isTransientGenerationStatusError,
  pollGenerationUntilComplete,
  startGeneration,
  streamAgentGeneration,
  type AgentGenerationResult,
  type AgentStreamEvent,
} from "@/lib/generation-client";
import {
  createChatSessionRecord,
  loadChatSessionIndex,
  loadChatSessionMessages,
  saveChatSessionMessages,
  type ChatSessionMeta,
} from "@/lib/dashboard-chat-sessions";
import { notify } from "@/lib/notify";
import { uploadStudioAsset } from "@/lib/studio-asset-upload";
import { ChatScriptView } from "@/components/dashboard/ChatScriptView";
import { DashboardChatHistoryDropdown } from "@/components/dashboard/DashboardChatSessionList";
import { AgentStepProgress } from "@/components/dashboard/AgentStepProgress";
import { AgentThinking } from "@/components/dashboard/AgentThinking";
import { cn } from "@/lib/utils";

function newId() {
  return crypto.randomUUID();
}

function toolIcon(mode: ChatToolMode) {
  if (mode === "image") return ImagePlus;
  if (mode === "edit-video") return Pencil;
  if (mode === "extend-video") return Film;
  return Video;
}

export function DashboardChat({
  sessionId,
  canCreate = true,
}: {
  sessionId: string;
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [showProductUrl, setShowProductUrl] = useState(false);
  const [productResearchSummary, setProductResearchSummary] = useState<string | null>(null);
  const [productContextCache, setProductContextCache] = useState<string | null>(null);
  const [productContextUrl, setProductContextUrl] = useState<string | null>(null);
  const [isResearchingProduct, setIsResearchingProduct] = useState(false);
  const [toolMode, setToolMode] = useState<ChatToolMode>("video");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [agentMode, setAgentMode] = useState(true);
  const [imageModel, setImageModel] = useState("openai/gpt-image-1");
  const [videoModel, setVideoModel] = useState("openai/sora-2");
  const launchHandledRef = useRef<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const refreshSessions = useCallback(() => {
    setSessions(loadChatSessionIndex());
  }, []);

  useEffect(() => {
    const index = loadChatSessionIndex();
    if (!index.some((item) => item.id === sessionId)) {
      createChatSessionRecord(sessionId);
    }
    setMessages(loadChatSessionMessages(sessionId));
    setDraft("");
    setProductUrl("");
    setShowProductUrl(false);
    setProductResearchSummary(null);
    setProductContextCache(null);
    setProductContextUrl(null);
    setAttachments([]);
    setHydrated(true);
    refreshSessions();
  }, [sessionId, refreshSessions]);

  useEffect(() => {
    if (!hydrated) return;
    saveChatSessionMessages(sessionId, messages);
    refreshSessions();
  }, [messages, hydrated, sessionId, refreshSessions]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isBusy]);

  const clearAttachments = useCallback(() => {
    for (const item of attachments) {
      if (item.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
    setAttachments([]);
  }, [attachments]);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const addAttachmentFromFile = async (file: File) => {
    const kind = file.type.startsWith("video/") ? "video" : "image";
    if (kind === "video" && toolMode === "image") {
      setToolMode("edit-video");
    }

    setIsUploading(true);
    try {
      const url = await uploadStudioAsset(file, kind);
      setAttachments((prev) => [
        ...prev,
        {
          id: newId(),
          kind,
          url,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
        },
      ]);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const addAttachmentFromAsset = (asset: {
    url: string;
    kind: "image" | "video" | "audio";
    name: string | null;
  }) => {
    if (asset.kind === "audio") {
      notify.error("Audio attachments are not supported in chat yet.");
      return;
    }
    const kind = asset.kind;
    if (kind === "video" && toolMode === "image") {
      setToolMode("edit-video");
    }
    setAttachments((prev) => [
      ...prev,
      {
        id: newId(),
        kind,
        url: asset.url,
        previewUrl: asset.url,
        name: asset.name ?? `${kind} from library`,
      },
    ]);
  };

  const updateAssistant = useCallback(
    (id: string, patch: Partial<ChatMessage>, ownerSessionId: string) => {
      setMessages((prev) => {
        if (ownerSessionId !== sessionIdRef.current) return prev;
        return prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg));
      });
    },
    [],
  );

  const runGeneration = async (
    ownerSessionId: string,
    assistantId: string,
    prompt: string,
    mode: ChatToolMode,
    refs: ChatAttachment[],
    options?: { productUrl?: string; aspectRatio?: string },
  ) => {
    const imageRef = refs.find((item) => item.kind === "image");
    const videoRef = refs.find((item) => item.kind === "video");

    if (mode === "image") {
      const result = await startGeneration({
        outputType: "image",
        format: "STATIC",
        prompt,
        productUrl: options?.productUrl,
        referenceImageUrl: imageRef?.url,
        style: { aspectRatio: options?.aspectRatio ?? "9:16", outputType: "image" },
      });

      if (result.status === "COMPLETED" && result.imageUrl) {
        updateAssistant(
          assistantId,
          {
            status: "completed",
            outputType: "image",
            imageUrl: result.imageUrl,
            generationId: result.jobId,
          },
          ownerSessionId,
        );
        return;
      }

      throw new Error(result.error ?? "Image generation failed.");
    }

    const videoOperation =
      mode === "edit-video" ? "edit" : mode === "extend-video" ? "extend" : "auto";

    const started = await startGeneration({
      outputType: "video",
      format: "UGC",
      prompt,
      productUrl: options?.productUrl,
      referenceImageUrl: imageRef?.url,
      referenceVideoUrl: videoRef?.url,
      videoOperation,
      adhereToScript: Boolean(imageRef || videoRef),
      style: {
        aspectRatio: options?.aspectRatio ?? "9:16",
        duration: 10,
        resolution: "480p",
        outputType: "video",
      },
    });

    updateAssistant(
      assistantId,
      {
        status: "processing",
        generationId: started.jobId,
        scriptText: started.scriptText,
      },
      ownerSessionId,
    );

    if (started.status === "COMPLETED" && started.videoUrl) {
      updateAssistant(
        assistantId,
        {
          status: "completed",
          outputType: "video",
          videoUrl: started.videoUrl,
          scriptText: started.scriptText,
        },
        ownerSessionId,
      );
      return;
    }

    let transientStatusErrors = 0;

    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      let status: Awaited<ReturnType<typeof fetchGenerationStatus>>;

      try {
        status = await fetchGenerationStatus(started.jobId);
        transientStatusErrors = 0;
      } catch (error) {
        if (isTransientGenerationStatusError(error) && transientStatusErrors < 12) {
          transientStatusErrors += 1;
          continue;
        }

        throw error;
      }

      if (status.scriptText) {
        updateAssistant(assistantId, { scriptText: status.scriptText }, ownerSessionId);
      }

      if (status.status === "COMPLETED" && status.videoUrl) {
        updateAssistant(
          assistantId,
          {
            status: "completed",
            outputType: "video",
            videoUrl: status.videoUrl,
          },
          ownerSessionId,
        );
        return;
      }

      if (status.status === "FAILED") {
        throw new Error(status.errorMessage ?? "Video generation failed.");
      }
    }

    try {
      const polled = await pollGenerationUntilComplete(started.jobId, { maxAttempts: 1 });
      if (polled.videoUrl) {
        updateAssistant(
          assistantId,
          {
            status: "completed",
            outputType: "video",
            videoUrl: polled.videoUrl,
          },
          ownerSessionId,
        );
        return;
      }
    } catch {
      // fall through
    }

    throw new Error("Timed out waiting for video generation.");
  };

  const runAgentGeneration = async (
    ownerSessionId: string,
    assistantId: string,
    prompt: string,
    refs: ChatAttachment[],
    options?: { productUrl?: string; aspectRatio?: string; productContext?: string },
  ) => {
    const imageRef = refs.find((item) => item.kind === "image");
    const referenceImageUrls = refs.filter((item) => item.kind === "image").map((item) => item.url);

    const initialSteps: AgentStep[] = [
      ...(options?.productUrl
        ? [{ id: "research", label: "research", description: "Researching product page", status: "running" as const }]
        : []),
      { id: "think", label: "think", description: "Analyzing prompt", status: options?.productUrl ? "pending" : "running" },
      { id: "script", label: "script", description: "Writing script", status: "pending" },
      { id: "image", label: "image", description: "Generating image", status: "pending" },
      { id: "audio", label: "audio", description: "Creating voiceover", status: "pending" },
      { id: "video", label: "video", description: "Rendering video", status: "pending" },
    ];

    updateAssistant(
      assistantId,
      {
        agentMode: true,
        thinking: "Analyzing your prompt…",
        agentSteps: initialSteps,
      },
      ownerSessionId,
    );

    const step = (id: string, status: AgentStep["status"], patch?: Partial<AgentStep>) => {
      const updated = initialSteps.map((s) => (s.id === id ? { ...s, ...patch, status } : s));
      // keep local array in sync
      initialSteps.splice(0, initialSteps.length, ...updated);
      updateAssistant(assistantId, { agentSteps: updated }, ownerSessionId);
    };

    return new Promise<void>((resolve, reject) => {
      let finalResult: {
        generationId: string;
        scriptText: string;
        imageUrl?: string;
        audioUrl?: string;
        videoUrl?: string;
        requestId?: string;
        thinking?: string[];
        settings?: AgentGenerationResult["settings"];
      } | null = null;

      const cleanup = streamAgentGeneration(
        {
          prompt,
          aspectRatio: options?.aspectRatio ?? "9:16",
          productUrl: options?.productUrl,
          productContext: options?.productContext,
          referenceImageUrl: imageRef?.url,
          referenceImageUrls,
          imageModel,
          videoModel,
        },
        (event: AgentStreamEvent) => {
          const { step: stepName, status, payload } = event;
          const agentStepIds = new Set(["research", "think", "script", "image", "audio", "video"]);

          if (agentStepIds.has(stepName) && status === "running") {
            step(stepName, "running");
            if (stepName === "research") {
              updateAssistant(
                assistantId,
                { thinking: "Researching product and website…" },
                ownerSessionId,
              );
            }
            if (stepName === "script") {
              step("think", "completed");
            }
          }

          if (stepName === "research" && status === "completed") {
            step("research", "completed", {
              output: (payload?.productContext as string | undefined)?.split("\n")[0],
              assetKind: "script",
            });
            step("think", "running");
            updateAssistant(
              assistantId,
              {
                thinking: payload?.partial
                  ? "Using limited product details — continuing with your prompt…"
                  : "Product research complete — planning your ad…",
              },
              ownerSessionId,
            );
          }

          if (stepName === "think" && status === "completed") {
            step("think", "completed");
            if (payload?.thinking) {
              updateAssistant(
                assistantId,
                {
                  thinking: "Analysis complete",
                  thinkingSteps: payload.thinking as string[],
                  settings: payload.settings as AgentGenerationResult["settings"],
                },
                ownerSessionId,
              );
            }
          }

          if (stepName === "script" && status === "completed") {
            step("script", "completed", { output: payload?.scriptText as string, assetKind: "script" });
          }

          if (stepName === "image" && status === "completed") {
            step("image", "completed", { assetUrl: payload?.imageUrl as string, assetKind: "image" });
          }

          if (stepName === "audio" && status === "completed") {
            step("audio", "completed", { assetUrl: payload?.audioUrl as string, assetKind: "audio" });
          }

          if (stepName === "video" && status === "completed") {
            step("video", "completed", { assetUrl: payload?.videoUrl as string, assetKind: "video" });
            if (payload?.videoUrl) {
              updateAssistant(
                assistantId,
                {
                  status: "completed",
                  outputType: "video",
                  videoUrl: payload.videoUrl as string,
                  imageUrl: payload.imageUrl as string,
                  scriptText: payload.scriptText as string,
                  generationId: payload.generationId as string,
                  thinking: undefined,
                },
                ownerSessionId,
              );
              cleanup();
              resolve();
              return;
            }
          }

          if (stepName === "done") {
            finalResult = {
              generationId: payload?.generationId as string,
              scriptText: payload?.scriptText as string,
              imageUrl: payload?.imageUrl as string,
              audioUrl: payload?.audioUrl as string,
              videoUrl: payload?.videoUrl as string,
              requestId: payload?.requestId as string,
              thinking: payload?.thinking as string[],
              settings: payload?.settings as AgentGenerationResult["settings"],
            };

            if (finalResult.videoUrl) {
              step("video", "completed", { assetUrl: finalResult.videoUrl, assetKind: "video" });
              updateAssistant(
                assistantId,
                {
                  status: "completed",
                  outputType: "video",
                  videoUrl: finalResult.videoUrl,
                  imageUrl: finalResult.imageUrl,
                  scriptText: finalResult.scriptText,
                  generationId: finalResult.generationId,
                  thinking: undefined,
                },
                ownerSessionId,
              );
              cleanup();
              resolve();
              return;
            }

            if (finalResult.requestId) {
              step("video", "running");
              pollGenerationUntilComplete(finalResult.generationId, {
                maxAttempts: 120,
                intervalMs: 5000,
              })
                .then((polled) => {
                  if (polled.videoUrl) {
                    step("video", "completed", { assetUrl: polled.videoUrl, assetKind: "video" });
                    updateAssistant(
                      assistantId,
                      {
                        status: "completed",
                        outputType: "video",
                        videoUrl: polled.videoUrl,
                        imageUrl: finalResult?.imageUrl,
                        scriptText: finalResult?.scriptText,
                        generationId: finalResult?.generationId,
                        thinking: undefined,
                      },
                      ownerSessionId,
                    );
                  } else {
                    throw new Error("Video generation did not return a video URL.");
                  }
                })
                .catch((err) => {
                  const message = err instanceof Error ? err.message : "Agent generation failed.";
                  updateAssistant(
                    assistantId,
                    { status: "failed", error: message, thinking: undefined },
                    ownerSessionId,
                  );
                  reject(err);
                })
                .finally(() => cleanup());
              return;
            }

            cleanup();
            resolve();
            return;
          }

          if (stepName === "error") {
            const message = (payload?.error as string) || "Agent generation failed.";
            const runningStep = initialSteps.find((item) => item.status === "running");
            if (runningStep) {
              step(runningStep.id, "failed", { error: message });
            }
            updateAssistant(
              assistantId,
              { status: "failed", error: message, thinking: undefined },
              ownerSessionId,
            );
            cleanup();
            reject(new Error(message));
          }
        },
        (error) => {
          const isCreditError = isInsufficientCreditsError(error);
          const message = error instanceof Error ? error.message : "Agent generation failed.";
          updateAssistant(
            assistantId,
            {
              status: "failed",
              error: isCreditError
                ? `${message} Upgrade your plan to get more credits.`
                : message,
              thinking: undefined,
            },
            ownerSessionId,
          );
          cleanup();
          reject(error);
        },
      );
    });
  };

  const submitPrompt = async (input: {
    promptText?: string;
    mode?: ChatToolMode;
    refs?: ChatAttachment[];
    productUrl?: string;
    aspectRatio?: string;
    clearDraft?: boolean;
  }) => {
    if (!canCreate) {
      notify.error("Your account does not have access to create content.");
      return;
    }

    const refs = input.refs ?? attachments;
    const mode = input.mode ?? inferToolMode(toolMode, refs);
    const activeProductUrl = input.productUrl ?? productUrl;
    const validation = validateChatPrompt(input.promptText ?? draft, refs, mode, activeProductUrl);
    if (!validation.ok) {
      notify.error(validation.message);
      return;
    }

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      createdAt: Date.now(),
      text: validation.prompt,
      attachments: refs.length ? [...refs] : undefined,
      productUrl: activeProductUrl.trim() || undefined,
      toolMode: mode,
    };

    const assistantId = newId();
    const ownerSessionId = sessionIdRef.current;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      createdAt: Date.now(),
      toolMode: mode,
      status: "processing",
      text: `Creating your ${toolModeLabel(mode).toLowerCase()}…`,
    };

    setMessages((prev) => {
      if (ownerSessionId !== sessionIdRef.current) return prev;
      return [...prev, userMessage, assistantMessage];
    });
    if (input.clearDraft !== false) {
      setDraft("");
      setProductUrl("");
      setShowProductUrl(false);
      setProductResearchSummary(null);
      clearAttachments();
    }
    setIsBusy(true);

    try {
      if (agentMode) {
        await runAgentGeneration(ownerSessionId, assistantId, validation.prompt, refs, {
          productUrl: activeProductUrl.trim() || undefined,
          productContext:
            activeProductUrl.trim() && productContextUrl === activeProductUrl.trim()
              ? productContextCache ?? undefined
              : undefined,
          aspectRatio: input.aspectRatio,
        });
      } else {
        await runGeneration(ownerSessionId, assistantId, validation.prompt, mode, refs, {
          productUrl: activeProductUrl.trim() || undefined,
          aspectRatio: input.aspectRatio,
        });
      }
    } catch (error) {
      const isCreditError = isInsufficientCreditsError(error);
      const message = error instanceof Error ? error.message : "Generation failed.";
      updateAssistant(
        assistantId,
        {
          status: "failed",
          error: isCreditError
            ? `${message} Upgrade your plan to get more credits.`
            : message,
          text: undefined,
        },
        ownerSessionId,
      );
    } finally {
      setIsBusy(false);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    await submitPrompt({ promptText: textOverride, productUrl: productUrl.trim() || undefined });
  };

  const previewProductResearch = useCallback(async () => {
    const trimmed = productUrl.trim();
    if (!trimmed) {
      setProductResearchSummary(null);
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      notify.error("Enter a valid product URL (https://…).");
      return;
    }

    setIsResearchingProduct(true);
    try {
      const response = await fetch("/api/dashboard/product-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: trimmed }),
      });
      const data = (await response.json()) as {
        context?: string;
        partial?: boolean;
        research?: { summary?: string; brandName?: string; productName?: string };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not research that URL.");
      }
      const headline = [data.research?.brandName, data.research?.productName].filter(Boolean).join(" · ");
      setProductResearchSummary(
        headline ? `${headline} — ${data.research?.summary ?? ""}` : data.research?.summary ?? null,
      );
      setProductContextCache(data.context ?? null);
      setProductContextUrl(trimmed);
    } catch (error) {
      setProductResearchSummary(null);
      notify.error(error instanceof Error ? error.message : "Product research failed.");
    } finally {
      setIsResearchingProduct(false);
    }
  }, [productUrl]);

  const runLaunch = useCallback(
    (launch: {
      prompt: string;
      toolMode: ChatToolMode;
      referenceImageUrl?: string;
      referenceVideoUrl?: string;
      productUrl?: string;
      aspectRatio?: string;
    }) => {
      setToolMode(launch.toolMode);
      if (launch.productUrl) {
        setProductUrl(launch.productUrl);
        setShowProductUrl(true);
      }

      const launchAttachments: ChatAttachment[] = [];
      if (launch.referenceImageUrl) {
        launchAttachments.push({
          id: newId(),
          kind: "image",
          url: launch.referenceImageUrl,
        });
      }
      if (launch.referenceVideoUrl) {
        launchAttachments.push({
          id: newId(),
          kind: "video",
          url: launch.referenceVideoUrl,
        });
      }

      void (async () => {
        await submitPrompt({
          promptText: launch.prompt,
          mode: launch.toolMode,
          refs: launchAttachments,
          productUrl: launch.productUrl,
          aspectRatio: launch.aspectRatio,
          clearDraft: false,
        });
        clearDashboardChatLaunch();
        if (searchParams.get("prompt")) {
          router.replace(`/dashboard/chat/${sessionId}`);
        }
      })();
    },
    [router, searchParams, sessionId],
  );

  useEffect(() => {
    if (!hydrated || launchHandledRef.current === sessionId) return;

    const fromUrl = launchFromSearchParams(searchParams);
    const fromStorage = readDashboardChatLaunch();
    const launch = fromUrl
      ? {
          ...fromUrl,
          referenceImageUrl: fromStorage?.referenceImageUrl ?? fromUrl.referenceImageUrl,
          referenceVideoUrl: fromStorage?.referenceVideoUrl ?? fromUrl.referenceVideoUrl,
          productUrl: fromStorage?.productUrl ?? fromUrl.productUrl,
          aspectRatio: fromStorage?.aspectRatio ?? fromUrl.aspectRatio,
        }
      : fromStorage;

    if (!launch) return;

    const alreadyQueued = messages.some(
      (message) => message.role === "user" && message.text === launch.prompt,
    );
    if (alreadyQueued) {
      launchHandledRef.current = sessionId;
      clearDashboardChatLaunch();
      if (searchParams.get("prompt")) {
        router.replace(`/dashboard/chat/${sessionId}`);
      }
      return;
    }

    launchHandledRef.current = sessionId;
    runLaunch(launch);
  }, [hydrated, searchParams, runLaunch, messages, router, sessionId]);

  const hasMessages = messages.length > 0;
  const ActiveToolIcon = toolIcon(toolMode);

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-transparent">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-100/80 bg-transparent px-3 py-2.5 md:px-4 md:py-3">
        <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 rounded-full" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </Button>
        <DashboardChatHistoryDropdown
          sessions={sessions}
          activeSessionId={sessionId}
          onSessionsChange={refreshSessions}
        />
        <div className="flex-1" />
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent px-1 pb-28 md:px-2 md:pb-32">
        {!hasMessages ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-10 text-center md:py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              What would you like to create?
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              Quick mode for instant results. Toggle Agent mode for a full creative pipeline — script, image, voiceover, and video in one go.
            </p>
            <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
              {CHAT_STARTER_PROMPTS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void sendMessage(starter)}
                  className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-left text-sm text-zinc-700 transition hover:border-purple-200 hover:bg-purple-50/50 hover:text-zinc-900"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 py-6 md:px-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-transparent px-3 pb-4 md:px-6 md:pb-5">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl bg-transparent">
          {attachments.length > 0 ? (
            <div className="mb-1.5 flex flex-wrap gap-2">
              {attachments.map((item) => (
                <div key={item.id} className="relative flex items-center gap-1.5 text-xs text-zinc-600">
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl ?? item.url}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover ring-1 ring-zinc-200/80"
                    />
                  ) : (
                    <Clapperboard className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                  <span className="max-w-[120px] truncate">{item.name ?? item.kind}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-700"
                    onClick={() => removeAttachment(item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {showProductUrl ? (
            <div className="mb-2 space-y-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-3">
              <Input
                value={productUrl}
                onChange={(event) => {
                  setProductUrl(event.target.value);
                  setProductResearchSummary(null);
                  setProductContextCache(null);
                  setProductContextUrl(null);
                }}
                onBlur={() => {
                  if (productUrl.trim()) void previewProductResearch();
                }}
                disabled={isBusy}
                type="url"
                placeholder="https://your-product-page.com"
                className="h-10 border-zinc-200 bg-zinc-50"
              />
              {isResearchingProduct ? (
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Researching product and website…
                </p>
              ) : productResearchSummary ? (
                <p className="text-xs leading-5 text-zinc-600">{productResearchSummary}</p>
              ) : (
                <p className="text-xs text-zinc-500">
                  We&apos;ll read the page and use OpenAI to extract brand, product, and offer details for your ad.
                </p>
              )}
            </div>
          ) : null}

          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            disabled={isBusy}
            rows={1}
            placeholder="Describe what to create, edit, or extend…"
            className="max-h-32 !min-h-[2.25rem] resize-none border-0 !bg-transparent px-0 py-1 text-[15px] leading-6 text-zinc-900 shadow-none placeholder:text-zinc-400 hover:border-transparent hover:!bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <div className="flex items-center justify-between gap-2 bg-transparent">
            <div className="flex items-center gap-0.5">
              <MediaUploadTrigger
                kinds={["image", "video"]}
                disabled={isBusy}
                uploading={isUploading}
                onFile={addAttachmentFromFile}
                onAsset={addAttachmentFromAsset}
                dialogTitle="Add attachment"
                dialogSubtitle="Image or video from your library, or upload from this device."
                trigger={({ open, disabled, uploading }) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-transparent text-zinc-500 hover:bg-transparent hover:text-zinc-800"
                    disabled={disabled}
                    onClick={open}
                    aria-label="Add attachment"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full bg-transparent text-zinc-500 hover:bg-transparent hover:text-zinc-800",
                  showProductUrl && "text-purple-700",
                )}
                disabled={isBusy}
                onClick={() => setShowProductUrl((open) => !open)}
                aria-label="Add product URL"
              >
                <Link2 className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full bg-transparent px-2 text-xs font-medium text-zinc-500 hover:bg-transparent hover:text-zinc-800"
                    disabled={isBusy}
                  >
                    <ActiveToolIcon className="h-3.5 w-3.5" />
                    {toolModeLabel(toolMode)}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {CHAT_TOOL_OPTIONS.map((option) => {
                    const Icon = toolIcon(option.id);
                    return (
                      <DropdownMenuItem
                        key={option.id}
                        className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
                        onClick={() => setToolMode(option.id)}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </span>
                        <span className="text-xs text-zinc-500">{option.description}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setAgentMode((prev) => !prev)}
                disabled={isBusy}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  agentMode
                    ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
                )}
              >
                {agentMode ? <Wand2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {agentMode ? "Agent" : "Quick"}
              </button>

              {agentMode && (
                <div className="flex items-center gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200"
                      >
                        <ImageIcon className="h-3 w-3" />
                        {imageModel === "openai/dall-e-3" ? "DALL·E 3" : "GPT Image"}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setImageModel("openai/dall-e-3")}>
                        DALL·E 3
                        <span className="ml-1 text-[10px] text-zinc-400">($0.04)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setImageModel("openai/gpt-image-1")}>
                        GPT Image 1
                        <span className="ml-1 text-[10px] text-zinc-400">($0.05)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200"
                      >
                        <VideoIcon className="h-3 w-3" />
                        {videoModel === "openai/sora-2" ? "Sora" : "Sora Pro"}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setVideoModel("openai/sora-2")}>
                        Sora 2
                        <span className="ml-1 text-[10px] text-zinc-400">($0.50)</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setVideoModel("openai/sora-2-pro")}>
                        Sora 2 Pro
                        <span className="ml-1 text-[10px] text-zinc-400">($1.00)</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-transparent text-zinc-700 hover:bg-transparent hover:text-zinc-900"
              disabled={isBusy || !canCreate}
              onClick={() => void sendMessage()}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const showProcessing =
    message.status === "processing" && !message.imageUrl && !message.videoUrl;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-2">
          {message.attachments?.length ? (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((item) =>
                item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.previewUrl ?? item.url}
                    alt=""
                    className="max-h-40 rounded-2xl border border-white/20 object-cover shadow-sm"
                  />
                ) : (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-2xl bg-zinc-800 px-3 py-2 text-xs text-zinc-200"
                  >
                    <Clapperboard className="h-4 w-4" />
                    Video attached
                  </div>
                ),
              )}
            </div>
          ) : null}
          {message.productUrl ? (
            <div className="flex justify-end">
              <a
                href={message.productUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-600"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{message.productUrl.replace(/^https?:\/\//, "")}</span>
              </a>
            </div>
          ) : null}
          <div className="rounded-[1.25rem] bg-zinc-900 px-4 py-3 text-[15px] leading-6 text-white whitespace-pre-wrap">
            {message.text}
          </div>
          {message.toolMode ? (
            <p className="text-right text-[11px] text-zinc-400">{toolModeLabel(message.toolMode)}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3 text-zinc-900">
        {message.agentMode && message.thinking ? (
          <AgentThinking text={message.thinking} steps={message.thinkingSteps} />
        ) : null}

        {message.agentMode && message.agentSteps ? (
          <AgentStepProgress steps={message.agentSteps} />
        ) : null}

        {showProcessing ? (
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-600" />
            <span>{message.text ?? "Working on it…"}</span>
          </div>
        ) : null}

        {message.status === "failed" ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-wrap">
            {message.error ?? "Something went wrong."}
          </div>
        ) : null}

        {message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="Generated"
            className="max-h-[min(70vh,520px)] w-full rounded-2xl object-contain"
          />
        ) : null}

        {message.videoUrl ? (
          <video
            src={message.videoUrl}
            controls
            playsInline
            className="max-h-[min(70vh,520px)] w-full rounded-2xl object-contain"
          />
        ) : null}

        {message.scriptText ? (
          <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <ChatScriptView text={message.scriptText} />
          </div>
        ) : null}

        {message.status === "completed" && message.settings ? (
          <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
            <span>{message.settings.aspectRatio}</span>
            <span>·</span>
            <span>{message.settings.duration}s</span>
            <span>·</span>
            <span>{message.settings.imageModel}</span>
            <span>·</span>
            <span>{message.settings.videoModel}</span>
          </div>
        ) : null}

        {message.status === "completed" && message.generationId ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/generations/${message.generationId}`}>Open details</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={message.videoUrl ?? message.imageUrl ?? "#"} download target="_blank" rel="noreferrer">
                Download
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
