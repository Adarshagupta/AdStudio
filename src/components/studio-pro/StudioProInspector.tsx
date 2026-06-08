"use client";

import { X } from "lucide-react";

import { StudioInspectorGeneratingPreview } from "@/components/studio-pro/StudioMediaPreview";
import { StudioNodeAssetUpload } from "@/components/studio-pro/StudioNodeAssetUpload";
import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";
import { Button } from "@/components/ui/button";
import { cloudflareModels } from "@/lib/cloudflare/models";
import { imageModelLabel, isOpenAIImageModel, isOpenAIVideoModel } from "@/lib/openai-models";
import {
  clampVideoDuration,
  listDurationOptions,
  listResolutionOptions,
  normalizeStudioVideoAspectRatio,
  resolveLtxVideoRoute,
  studioVideoModelOptions,
} from "@/lib/ltx-video-models";
import type { StudioNode } from "@/lib/studio-pro/types";

export function StudioProInspector({
  node,
  onChange,
  onClose,
  referenceImageUrl,
  referenceImageUrls = [],
  referenceVideoUrl,
}: {
  node: StudioNode;
  onChange: (nodeId: string, data: Partial<StudioNode["data"]>) => void;
  onClose: () => void;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
}) {
  const imageCount = referenceImageUrls.length || (referenceImageUrl ? 1 : 0);

  const videoRoute =
    node.type === "video"
      ? resolveLtxVideoRoute({
          modelOverride: node.data.model,
          referenceImageUrl,
          referenceImageUrls,
          referenceVideoUrl,
          videoOperation: node.data.videoOperation ?? "auto",
        })
      : null;

  const videoModelChoices =
    node.type === "video"
      ? studioVideoModelOptions(imageCount > 0, Boolean(referenceVideoUrl))
      : [];

  const isGeneratingMedia =
    node.data.status === "running" && (node.type === "image" || node.type === "video");

  return (
    <aside className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-zinc-900">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{node.title}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isGeneratingMedia
              ? node.type === "image"
                ? "Generating image…"
                : "Generating video…"
              : node.subtitle}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <StudioInspectorGeneratingPreview node={node} />

        <Field label="Model">
          <select
            value={node.data.model ?? ""}
            onChange={(event) => onChange(node.id, { model: event.target.value })}
            className="studio-input"
          >
            {getModelOptions(node.type, videoModelChoices).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {node.type === "video" && videoRoute ? (
          <>
            <p className="text-[11px] leading-5 text-zinc-500">
              {videoRoute.spec.label} · {videoRoute.spec.priceHint}
            </p>

            {referenceVideoUrl ? (
              <Field label="Video task">
                <select
                  value={node.data.videoOperation ?? "auto"}
                  onChange={(event) =>
                    onChange(node.id, {
                      videoOperation: event.target.value as StudioNode["data"]["videoOperation"],
                      model: "",
                    })
                  }
                  className="studio-input"
                >
                  <option value="auto">Auto — Retake section</option>
                  <option value="edit">Retake — restyle / transform clip</option>
                  <option value="extend">Extend — continue from last frame</option>
                  <option value="control">Retake — full clip replace</option>
                </select>
              </Field>
            ) : null}

            {imageCount > 0 ? (
              <p className="text-[11px] leading-5 text-zinc-600">
                {imageCount >= 2
                  ? `${imageCount} images connected — the first image drives image-to-video.`
                  : isOpenAIVideoModel(node.data.model)
                    ? "Image connected — OpenAI Sora will use the frame as a reference."
                    : "Image connected — LTX image-to-video will animate the frame."}
              </p>
            ) : null}

            {referenceVideoUrl && !referenceImageUrl ? (
              <p className="text-[11px] leading-5 text-zinc-600">
                Video connected — retake or extend based on your task above.
              </p>
            ) : null}

            {videoRoute.spec.supportsDuration && listDurationOptions(videoRoute.spec).length > 0 ? (
              <Field label={videoRoute.spec.mode === "video-extend" ? "Extend by" : "Duration"}>
                <select
                  value={clampVideoDuration(node.data.duration, videoRoute.spec)}
                  onChange={(event) =>
                    onChange(node.id, { duration: Number.parseInt(event.target.value, 10) })
                  }
                  className="studio-input"
                >
                  {listDurationOptions(videoRoute.spec).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Resolution">
              <select
                value={node.data.resolution ?? videoRoute.spec.defaultResolution}
                onChange={(event) => onChange(node.id, { resolution: event.target.value })}
                className="studio-input"
              >
                {listResolutionOptions(videoRoute.spec).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {videoRoute.spec.supportsAspectRatio ? (
              <Field label="Aspect ratio">
                <select
                  value={
                    normalizeStudioVideoAspectRatio(node.data.aspectRatio, videoRoute.spec) ??
                    "9:16"
                  }
                  onChange={(event) => onChange(node.id, { aspectRatio: event.target.value })}
                  className="studio-input"
                >
                  {videoRoute.spec.aspectRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="text-[11px] leading-5 text-zinc-500">
                Aspect ratio follows the reference {referenceVideoUrl ? "video" : "image"}.
              </p>
            )}
          </>
        ) : null}

        {node.type === "character" && (
          <Field label="Character name">
            <input
              value={node.data.characterName ?? ""}
              onChange={(event) => onChange(node.id, { characterName: event.target.value })}
              className="studio-input"
              placeholder="e.g. Maya, fitness creator"
            />
          </Field>
        )}

        {(node.type === "image" || node.type === "audio" || node.type === "video") && (
          <Field label="Media library">
            <StudioNodeAssetUpload node={node} onChange={(data) => onChange(node.id, data)} />
          </Field>
        )}

        {node.type === "image" && (
          <>
            <Field label="Resolution">
              <select
                value={node.data.resolution ?? "1K"}
                onChange={(event) => onChange(node.id, { resolution: event.target.value })}
                className="studio-input"
              >
                <option value="1K">1K</option>
                <option value="480p">480p</option>
                <option value="720p">720p</option>
              </select>
            </Field>
            <Field label="Aspect ratio">
              <select
                value={node.data.aspectRatio ?? "9:16"}
                onChange={(event) => onChange(node.id, { aspectRatio: event.target.value })}
                className="studio-input"
              >
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
              </select>
            </Field>
            <Field label="Output format">
              <select
                value={node.data.outputFormat ?? "png"}
                onChange={(event) => onChange(node.id, { outputFormat: event.target.value })}
                className="studio-input"
              >
                <option value="png">png</option>
                <option value="jpg">jpg</option>
                <option value="webp">webp</option>
              </select>
            </Field>
          </>
        )}

        {node.data.output && (node.type === "prompt" || node.type === "character") ? (
          <Field label="Generated output">
            <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-700 whitespace-pre-wrap">
              {studioNodeDisplayText(node)}
            </div>
          </Field>
        ) : null}

        {node.data.imageUrl && node.type === "image" && !isGeneratingMedia ? (
          <Field label="Preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={node.data.imageUrl} alt="Generated" className="w-full rounded-xl border border-zinc-100" />
          </Field>
        ) : null}

        {node.data.audioUrl && node.type === "audio" ? (
          <Field label="Preview">
            <audio src={node.data.audioUrl} controls className="w-full" />
          </Field>
        ) : null}

        {node.data.videoUrl && node.type === "video" && !isGeneratingMedia ? (
          <Field label="Preview">
            <video src={node.data.videoUrl} controls className="w-full rounded-xl" />
          </Field>
        ) : null}

        {node.data.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">{node.data.error}</div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function getModelOptions(type: StudioNode["type"], videoChoices: ReturnType<typeof studioVideoModelOptions>) {
  if (type === "prompt" || type === "character") {
    return cloudflareModels.text.options.map((value) => ({ value, label: value }));
  }
  if (type === "image") {
    return cloudflareModels.image.options.map((value) => ({
      value,
      label: isOpenAIImageModel(value) ? `${imageModelLabel(value)} (Premium)` : value,
    }));
  }
  if (type === "video") {
    return [
      { value: "", label: "Auto (recommended)" },
      ...videoChoices.map((spec) => ({
        value: spec.id,
        label: `${spec.label} — ${spec.priceHint}`,
      })),
    ];
  }
  if (type === "audio") {
    return cloudflareModels.audio.options.map((value) => ({ value, label: value }));
  }
  return [{ value: "custom-avatar", label: "custom-avatar" }];
}
