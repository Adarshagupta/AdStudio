"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

import { DashboardChatHistoryDropdown } from "@/components/dashboard/DashboardChatSessionList";
import {
  PromptCreateIcon,
  PromptDockIconButton,
  PromptImageIcon,
  PromptProductIcon,
  PromptReferenceIcon,
  PromptVideoIcon,
  type PromptDockTone,
} from "@/components/dashboard/PromptDockIcons";

import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
import { ImageWithEdit } from "@/components/shared/ImageWithEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type DashboardOutputType,
  validateDashboardPrompt,
} from "@/lib/dashboard-generation";
import { buildDashboardChatPath, saveDashboardChatLaunch, type ChatToolMode } from "@/lib/dashboard-chat";
import { loadChatSessionIndex, type ChatSessionMeta } from "@/lib/dashboard-chat-sessions";
import { notify } from "@/lib/notify";
import { uploadStudioAsset } from "@/lib/studio-asset-upload";
import { cn } from "@/lib/utils";

const outputModes: {
  id: DashboardOutputType;
  label: string;
  tone: PromptDockTone;
  icon: typeof PromptVideoIcon;
}[] = [
  { id: "video", label: "Video", tone: "video", icon: PromptVideoIcon },
  { id: "image", label: "Image", tone: "image", icon: PromptImageIcon },
];

const imageAspectRatios = [
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
] as const;

/** Reserve space at the bottom of dashboard scroll areas for the floating prompt dock. */
export const DASHBOARD_FLOATING_PROMPT_PADDING =
  "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-24";

export function HeroInput({ canCreate = true }: { canCreate?: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [showProductUrl, setShowProductUrl] = useState(false);
  const [outputType, setOutputType] = useState<DashboardOutputType>("video");
  const [aspectRatio, setAspectRatio] = useState<(typeof imageAspectRatios)[number]["value"]>("9:16");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionMeta[]>([]);
  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  const canCollapse =
    !referencePreview && !showProductUrl && !inputError && prompt.trim().length === 0;

  function maybeCollapse() {
    if (canCollapse) setExpanded(false);
  }

  /** Keep the dock open when clicking toolbar buttons (otherwise textarea blur collapses it). */
  function handleDockMouseDown(event: React.MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, [role='menuitem']") && !target.closest("textarea")) {
      event.preventDefault();
    }
  }

  useEffect(() => {
    if (!expanded || !canCollapse) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (dockRef.current?.contains(target)) return;
      if (target.closest("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")) {
        return;
      }
      maybeCollapse();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expanded, canCollapse]);

  const refreshChatSessions = useCallback(() => {
    setChatSessions(loadChatSessionIndex());
  }, []);

  useEffect(() => {
    refreshChatSessions();
  }, [refreshChatSessions]);

  function validateInput() {
    if (!canCreate) {
      const message = "Your account does not have access to create content.";
      setInputError(message);
      notify.error(message);
      return null;
    }

    const validation = validateDashboardPrompt(prompt, Boolean(referenceImageUrl));
    if (!validation.ok) {
      setInputError(validation.message);
      notify.error(validation.message);
      return null;
    }

    setInputError(null);

    if (productUrl.trim()) {
      try {
        new URL(productUrl.trim());
      } catch {
        notify.error("Add a valid product URL or leave the product link empty.");
        return null;
      }
    }

    return validation.prompt;
  }

  async function handleReferenceFile(file: File) {
    setIsUploadingReference(true);
    try {
      const url = await uploadStudioAsset(file, "image");
      setReferenceImageUrl(url);
      setReferencePreview(URL.createObjectURL(file));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not upload reference image.");
    } finally {
      setIsUploadingReference(false);
    }
  }

  function handleReferenceAsset(asset: { url: string }) {
    setReferenceImageUrl(asset.url);
    setReferencePreview(asset.url);
  }

  function clearReference() {
    setReferenceImageUrl(null);
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferencePreview(null);
  }

  function openChat(toolMode: ChatToolMode) {
    const trimmed = validateInput();
    if (!trimmed) return;

    const launch = {
      prompt: trimmed,
      toolMode,
      referenceImageUrl: referenceImageUrl ?? undefined,
      productUrl: productUrl.trim() || undefined,
      aspectRatio: outputType === "image" ? aspectRatio : "9:16",
    };

    saveDashboardChatLaunch(launch);

    setIsStarting(true);
    router.push(buildDashboardChatPath(launch));
  }

  function handleGenerate() {
    openChat(outputType === "image" ? "image" : "video");
  }

  function renderDockActions() {
    return (
      <>
        <MediaUploadTrigger
          kinds="image"
          disabled={isStarting || !canCreate}
          uploading={isUploadingReference}
          presentation="fullscreen"
          onFile={handleReferenceFile}
          onAsset={handleReferenceAsset}
          dialogTitle="Add reference image"
          onTriggerClick={() => setExpanded(true)}
          trigger={({ open, disabled, uploading }) => (
            <PromptDockIconButton
              tone="reference"
              active={Boolean(referencePreview)}
              aria-label="Add reference image"
              disabled={disabled}
              onClick={open}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PromptReferenceIcon />
              )}
            </PromptDockIconButton>
          )}
        />
        <PromptDockIconButton
          tone="product"
          active={showProductUrl}
          aria-label="Add product link"
          disabled={isStarting}
          onClick={() => {
            setExpanded(true);
            setShowProductUrl((value) => !value);
          }}
        >
          <PromptProductIcon />
        </PromptDockIconButton>
        <DashboardChatHistoryDropdown
          sessions={chatSessions}
          onSessionsChange={refreshChatSessions}
          trigger="dock"
          disabled={isStarting}
          onOpenChange={(open) => {
            if (open) {
              setExpanded(true);
              refreshChatSessions();
            }
          }}
        />
      </>
    );
  }

  const dockExpanded =
    expanded ||
    Boolean(referencePreview) ||
    showProductUrl ||
    Boolean(inputError) ||
    (outputType === "image" && expanded);

  return (
    <>
      <section className="mx-auto max-w-3xl px-1 pt-2 text-center md:pt-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="space-y-2"
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl md:leading-tight">
            Hi, what will we create today?
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse inspiration below, then describe your idea in the prompt bar.
          </p>
          {!canCreate ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Content creation is disabled for your account.
            </p>
          ) : null}
        </motion.div>
      </section>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-3 md:bottom-4"
        aria-label="Create prompt"
      >
        <motion.div
          className="pointer-events-auto w-full max-w-xl"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.05 }}
        >
          <div
            ref={dockRef}
            onMouseDown={handleDockMouseDown}
            className={cn(
              "border border-border/50 bg-background/80 text-left shadow-[0_8px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-md transition-[border-radius,box-shadow] focus-within:border-border/80 focus-within:shadow-[0_12px_40px_rgba(124,58,237,0.1)] dark:bg-background/70 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] dark:focus-within:shadow-[0_12px_40px_rgba(124,58,237,0.14)]",
              dockExpanded ? "rounded-2xl p-2.5" : "rounded-full px-2 py-1.5",
            )}
          >
            {outputType === "image" && dockExpanded ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-1 px-1">
                {imageAspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    disabled={isStarting}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:text-foreground",
                      aspectRatio === ratio.value &&
                        "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-1">
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted/30 p-1">
                {outputModes.map((mode) => {
                  const Icon = mode.icon;
                  const active = outputType === mode.id;
                  return (
                    <PromptDockIconButton
                      key={mode.id}
                      tone={mode.tone}
                      active={active}
                      title={mode.label}
                      disabled={isStarting}
                      onClick={() => {
                        setOutputType(mode.id);
                        setExpanded(true);
                      }}
                    >
                      <Icon />
                    </PromptDockIconButton>
                  );
                })}
              </div>

              <Textarea
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  if (inputError) setInputError(null);
                }}
                onFocus={() => setExpanded(true)}
                onBlur={(event) => {
                  const next = event.relatedTarget as Node | null;
                  if (next && dockRef.current?.contains(next)) return;
                  maybeCollapse();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleGenerate();
                  }
                }}
                disabled={isStarting}
                rows={dockExpanded ? 2 : 1}
                className={cn(
                  "min-h-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
                  dockExpanded ? "min-h-[52px] px-1" : "min-h-[2rem] px-0.5",
                )}
                placeholder={
                  outputType === "video" ? "Describe your video ad…" : "Describe your image…"
                }
              />

              <PromptDockIconButton
                tone="create"
                aria-label={outputType === "video" ? "Generate video" : "Generate image"}
                disabled={isStarting || !canCreate}
                onClick={handleGenerate}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PromptCreateIcon />
                )}
              </PromptDockIconButton>
            </div>

            {inputError ? (
              <p className="mt-1 px-2 text-xs text-red-600">{inputError}</p>
            ) : null}

            {dockExpanded ? (
              <>
                {referencePreview ? (
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-muted/40 px-2 py-1.5">
                    <ImageWithEdit
                      src={referencePreview}
                      alt="Reference"
                      className="h-9 w-9 rounded-md"
                      imgClassName="h-9 w-9 rounded-md object-cover"
                      size="sm"
                    />
                    <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                      Reference attached
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={isStarting}
                      onClick={clearReference}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}

                {showProductUrl ? (
                  <div className="mt-1.5 px-1">
                    <Input
                      value={productUrl}
                      onChange={(event) => setProductUrl(event.target.value)}
                      disabled={isStarting}
                      type="url"
                      placeholder="https://your-product.com"
                      className="h-8 border-border/60 bg-muted/30 text-sm"
                    />
                  </div>
                ) : null}

                <div className="mt-2 flex items-center gap-1 border-t border-border/50 pt-2">
                  {renderDockActions()}
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </>
  );
}
