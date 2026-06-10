"use client";

import { StudioNodeAssetUpload } from "@/components/studio-pro/StudioNodeAssetUpload";
import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";
import type { StudioNode } from "@/lib/studio-pro/types";

const compactField =
  "w-full border-0 border-b border-zinc-200 bg-transparent px-1 py-1.5 text-xs leading-4 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-purple-400";

export function StudioNodePromptPanel({
  node,
  onChange,
}: {
  node: StudioNode;
  onChange: (data: Partial<StudioNode["data"]>) => void;
}) {
  return (
    <div className="w-full" onPointerDown={(event) => event.stopPropagation()}>
      {renderFields(node, onChange)}
    </div>
  );
}

function NodeTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className={`${compactField} min-h-[52px] max-h-80 resize-y dark:border-zinc-700 dark:text-zinc-100`}
      placeholder={placeholder}
    />
  );
}

function renderFields(node: StudioNode, onChange: (data: Partial<StudioNode["data"]>) => void) {
  if (node.type === "prompt") {
    const generated = studioNodeDisplayText(node);
    const showGenerated = Boolean(
      generated && generated !== (node.data.prompt ?? "").trim(),
    );

    return (
      <div className="space-y-2">
        <NodeTextarea
          value={node.data.prompt ?? ""}
          onChange={(value) => onChange({ prompt: value })}
          placeholder="Prompt..."
        />
        {showGenerated ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Generated
            </p>
            <p className="whitespace-pre-wrap text-[11px] leading-[1.45] text-zinc-700">{generated}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (node.type === "character") {
    return (
      <div className="space-y-2">
        <input
          value={node.data.characterName ?? ""}
          onChange={(event) => onChange({ characterName: event.target.value })}
          className={compactField}
          placeholder="Name"
        />
        <NodeTextarea
          value={node.data.prompt ?? ""}
          onChange={(value) => onChange({ prompt: value })}
          placeholder="Character brief..."
        />
      </div>
    );
  }

  if (node.type === "image") {
    return (
      <div className="space-y-2">
        <StudioNodeAssetUpload node={node} onChange={onChange} compact />
        <NodeTextarea
          value={node.data.prompt ?? ""}
          onChange={(value) => onChange({ prompt: value })}
          placeholder="Shot notes (uses upstream Text / Character context)..."
          rows={2}
        />
      </div>
    );
  }

  if (node.type === "video") {
    return (
      <div className="space-y-2">
        <StudioNodeAssetUpload node={node} onChange={onChange} compact />
        <NodeTextarea
          value={node.data.prompt ?? ""}
          onChange={(value) => onChange({ prompt: value })}
          placeholder="Segment shot notes — lines & scene for THIS clip only (character/script live upstream)..."
          rows={2}
        />
      </div>
    );
  }

  if (node.type === "audio") {
    return (
      <div className="space-y-2">
        <StudioNodeAssetUpload node={node} onChange={onChange} compact />
        <NodeTextarea
          value={node.data.prompt ?? ""}
          onChange={(value) => onChange({ prompt: value })}
          placeholder="Speech script..."
          rows={2}
        />
        <div className="flex gap-4 pt-0.5">
          <input
            value={node.data.audioTitle ?? ""}
            onChange={(event) => onChange({ audioTitle: event.target.value })}
            className={`${compactField} min-w-0 flex-1`}
            placeholder="Title"
          />
          <input
            value={node.data.voiceStyle ?? ""}
            onChange={(event) => onChange({ voiceStyle: event.target.value })}
            className={`${compactField} min-w-0 flex-1`}
            placeholder="Voice"
          />
        </div>
      </div>
    );
  }

  if (node.type === "schedule") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={node.data.scheduleInterval ?? 60}
            onChange={(event) => onChange({ scheduleInterval: Number.parseInt(event.target.value, 10) })}
            className={`${compactField} w-20`}
            placeholder="60"
          />
          <span className="text-xs text-zinc-500">minutes</span>
          <select
            value={node.data.scheduleEnabled ? "enabled" : "paused"}
            onChange={(event) => onChange({ scheduleEnabled: event.target.value === "enabled" })}
            className={`${compactField} w-24`}
          >
            <option value="enabled">Enabled</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>
    );
  }

  if (node.type === "social") {
    return (
      <div className="space-y-2">
        <select
          value={node.data.socialProvider ?? "instagram"}
          onChange={(event) => onChange({ socialProvider: event.target.value })}
          className={compactField}
        >
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
          <option value="reddit">Reddit</option>
        </select>
        <NodeTextarea
          value={node.data.socialCaption ?? ""}
          onChange={(value) => onChange({ socialCaption: value })}
          placeholder="Caption..."
          rows={2}
        />
      </div>
    );
  }

  return null;
}
