"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2, Loader2, Send, Video, X } from "lucide-react";

import { DashboardChatHistoryDropdown } from "@/components/dashboard/DashboardChatSessionList";

import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
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

const outputModes: { id: DashboardOutputType; label: string; icon: typeof Video }[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImagePlus },
];

const imageAspectRatios = [
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
] as const;

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

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-6 text-center md:py-10">
      <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
        Quick create — video or image from one prompt
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-[2.75rem] md:leading-tight">
          Hi, what will we create today?
        </h1>
        <p className="text-sm text-zinc-500">
          Pick video or image, describe your idea, then send to open the chat workspace.
        </p>
        {!canCreate ? (
          <p className="text-sm text-amber-700">Content creation is disabled for your account.</p>
        ) : null}
      </div>

      <div className="w-full rounded-[1.75rem] bg-white p-4 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow focus-within:shadow-[0_12px_40px_rgba(124,58,237,0.08)]">
        <Textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleGenerate();
            }
          }}
          disabled={isStarting}
          className="min-h-[88px] resize-none border-0 bg-transparent p-1 text-base leading-6 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={
            outputType === "video"
              ? "Describe the ad — hook, product, audience. Short prompts work with a reference image."
              : "Describe the image you want — style, product, mood, background."
          }
        />

        {inputError ? (
          <p className="mt-2 px-1 text-left text-sm text-red-600">{inputError}</p>
        ) : null}

        {referencePreview ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referencePreview}
              alt="Reference"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-700">Reference image</p>
              <p className="truncate text-[11px] text-zinc-500">
                {outputType === "video" ? "Used for image-to-video generation" : "Used for style guidance"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={isStarting}
              onClick={clearReference}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {showProductUrl ? (
          <div className="mt-3">
            <Input
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              disabled={isStarting}
              type="url"
              placeholder="https://your-product.com"
              className="h-10 bg-zinc-50"
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <MediaUploadTrigger
              kinds="image"
              disabled={isStarting || !canCreate}
              uploading={isUploadingReference}
              onFile={handleReferenceFile}
              onAsset={handleReferenceAsset}
              dialogTitle="Add reference image"
              trigger={({ open, disabled, uploading }) => (
                <Button
                  type="button"
                  variant="icon"
                  size="icon"
                  className="h-10 w-10 bg-zinc-50"
                  aria-label="Add reference image"
                  disabled={disabled}
                  onClick={open}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </Button>
              )}
            />
            <Button
              type="button"
              variant="icon"
              size="icon"
              className={cn("h-10 w-10 bg-zinc-50", showProductUrl && "bg-purple-50 text-purple-700")}
              aria-label="Add product link"
              disabled={isStarting}
              onClick={() => setShowProductUrl((value) => !value)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <DashboardChatHistoryDropdown
              sessions={chatSessions}
              onSessionsChange={refreshChatSessions}
              trigger="icon"
              disabled={isStarting}
              onOpenChange={(open) => {
                if (open) refreshChatSessions();
              }}
            />
          </div>
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            aria-label={outputType === "video" ? "Generate video" : "Generate image"}
            disabled={isStarting || !canCreate}
            onClick={handleGenerate}
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex w-full justify-center gap-2">
        {outputModes.map((mode) => {
          const Icon = mode.icon;
          const active = outputType === mode.id;
          return (
            <Button
              key={mode.id}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className={cn("gap-2 rounded-full px-5", !active && "bg-white")}
              disabled={isStarting}
              onClick={() => setOutputType(mode.id)}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </Button>
          );
        })}
      </div>

      {outputType === "image" ? (
        <div className="flex w-full flex-wrap justify-center gap-2">
          {imageAspectRatios.map((ratio) => (
            <Button
              key={ratio.value}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "bg-white px-4",
                aspectRatio === ratio.value && "border-purple-200 bg-purple-50 text-purple-700",
              )}
              disabled={isStarting}
              onClick={() => setAspectRatio(ratio.value)}
            >
              {ratio.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
