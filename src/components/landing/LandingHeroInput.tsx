"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, Video } from "lucide-react";

import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveDashboardChatLaunch, type ChatToolMode } from "@/lib/dashboard-chat";
import {
  type DashboardOutputType,
  validateDashboardPrompt,
} from "@/lib/dashboard-generation";
import { notify } from "@/lib/notify";
import { uploadStudioAsset } from "@/lib/studio-asset-upload";
import { cn } from "@/lib/utils";

const outputModes: { id: DashboardOutputType; label: string; icon: typeof Video }[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImagePlus },
];

const videoStyles = [
  { label: "UGC", slug: "ugc-talking-head" },
  { label: "Brain rot", slug: "brain-rot" },
  { label: "Review", slug: "review-style" },
] as const;

const imageAspectRatios = [
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
] as const;

export function LandingHeroInput() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [outputType, setOutputType] = useState<DashboardOutputType>("video");
  const [aspectRatio, setAspectRatio] = useState<(typeof imageAspectRatios)[number]["value"]>("9:16");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  function handleGenerate() {
    const validation = validateDashboardPrompt(prompt, Boolean(referenceImageUrl));
    if (!validation.ok) {
      setInputError(validation.message);
      notify.error(validation.message);
      return;
    }

    setInputError(null);
    const toolMode: ChatToolMode = outputType === "image" ? "image" : "video";
    const launch = {
      prompt: validation.prompt,
      toolMode,
      referenceImageUrl: referenceImageUrl ?? undefined,
      aspectRatio: outputType === "image" ? aspectRatio : "9:16",
    };

    saveDashboardChatLaunch(launch);
    setIsStarting(true);
    const signupUrl = new URL("/signup", window.location.origin);
    signupUrl.searchParams.set("prompt", launch.prompt);
    signupUrl.searchParams.set("tool", launch.toolMode);
    if (launch.aspectRatio) signupUrl.searchParams.set("aspect", launch.aspectRatio);
    router.push(`${signupUrl.pathname}${signupUrl.search}`);
  }

  async function handleReferenceFile(file: File) {
    setIsUploadingReference(true);
    try {
      const url = await uploadStudioAsset(file, "image");
      setReferenceImageUrl(url);
      setReferencePreview(URL.createObjectURL(file));
    } catch {
      notify.info("Sign up free to upload reference images — you can still describe your idea below.");
    } finally {
      setIsUploadingReference(false);
    }
  }

  return (
    <div className="mt-6 w-full max-w-3xl text-left md:mt-7">
      <div className="flex justify-center gap-2">
        {outputModes.map((mode) => {
          const Icon = mode.icon;
          const active = outputType === mode.id;
          return (
            <Button
              key={mode.id}
              type="button"
              size="sm"
              className={cn(
                "gap-2 rounded-full px-5",
                active
                  ? "border-0 bg-white text-violet-950 shadow-md hover:bg-white/95"
                  : "border border-white/30 bg-white/15 text-white hover:bg-white/25",
              )}
              disabled={isStarting}
              onClick={() => setOutputType(mode.id)}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[1.75rem] bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.18)] transition-shadow focus-within:shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
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
              ? "Describe your ad — hook, product, audience…"
              : "Describe the image you want — style, product, mood…"
          }
        />

        {inputError ? <p className="mt-2 px-1 text-sm text-red-600">{inputError}</p> : null}

        {referencePreview ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={referencePreview} alt="Reference" className="h-14 w-14 rounded-xl object-cover" />
            <p className="text-xs text-zinc-600">Reference attached</p>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <MediaUploadTrigger
            kinds="image"
            showLibrary={false}
            disabled={isStarting}
            uploading={isUploadingReference}
            onFile={handleReferenceFile}
            onAsset={() => undefined}
            dialogTitle="Add reference image"
            trigger={({ open, disabled, uploading }) => (
              <Button
                type="button"
                variant="icon"
                size="icon"
                className="h-10 w-10 bg-zinc-50"
                aria-label="Add reference image from device"
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
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            aria-label="Continue to create"
            disabled={isStarting}
            onClick={handleGenerate}
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {outputType === "video"
          ? videoStyles.map((style) => (
              <span
                key={style.slug}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
              >
                {style.label}
              </span>
            ))
          : imageAspectRatios.map((ratio) => (
              <button
                key={ratio.value}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  aspectRatio === ratio.value
                    ? "border-white bg-white text-violet-950"
                    : "border-white/25 bg-white/10 text-white/90 hover:bg-white/20",
                )}
                disabled={isStarting}
                onClick={() => setAspectRatio(ratio.value)}
              >
                {ratio.label}
              </button>
            ))}
      </div>

      <p className="mt-4 text-center text-sm text-white/80">
        Free to start —{" "}
        <Link href="/login" className="font-medium text-white underline-offset-2 hover:underline">
          log in
        </Link>{" "}
        if you already have an account
      </p>
    </div>
  );
}
