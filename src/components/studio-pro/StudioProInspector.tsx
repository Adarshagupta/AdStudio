"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cloudflareModels } from "@/lib/cloudflare/models";
import type { StudioNode } from "@/lib/studio-pro/types";

export function StudioProInspector({
  node,
  onChange,
  onClose,
}: {
  node: StudioNode | null;
  onChange: (nodeId: string, data: Partial<StudioNode["data"]>) => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-zinc-100 bg-white p-5 md:w-[300px]">
        <p className="text-sm font-medium text-zinc-900">Inspector</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Click a node to edit its prompt in the panel below it. Use this sidebar for model and output settings.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex max-h-[calc(100vh-3.5rem)] w-[280px] shrink-0 flex-col border-l border-zinc-100 bg-white md:w-[300px]">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">{node.title}</p>
          <p className="text-[11px] text-zinc-500">{node.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Model">
          <select
            value={node.data.model ?? ""}
            onChange={(event) => onChange(node.id, { model: event.target.value })}
            className="studio-input"
          >
            {getModelOptions(node.type).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        {(node.type === "character") && (
          <Field label="Character name">
            <input
              value={node.data.characterName ?? ""}
              onChange={(event) => onChange(node.id, { characterName: event.target.value })}
              className="studio-input"
              placeholder="e.g. Maya, fitness creator"
            />
          </Field>
        )}

        {(node.type === "image" || node.type === "video") && (
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
          </>
        )}

        {node.type === "image" && (
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
        )}

        {node.data.output && (node.type === "prompt" || node.type === "character") ? (
          <Field label="Generated output">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-zinc-700">
              {node.data.output}
            </div>
          </Field>
        ) : null}

        {node.data.imageUrl && node.type === "image" ? (
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

        {node.data.videoUrl && node.type === "video" ? (
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

function getModelOptions(type: StudioNode["type"]) {
  if (type === "prompt" || type === "character") return [...cloudflareModels.text.options];
  if (type === "image") return [...cloudflareModels.image.options];
  if (type === "video") return ["Requires AI Gateway credits"];
  if (type === "audio") return [...cloudflareModels.audio.options];
  return ["custom-avatar"];
}
