"use client";

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
    <div
      className="mt-2 w-full rounded-lg bg-white/95 px-3 py-2.5 shadow-sm ring-1 ring-zinc-200/80 backdrop-blur-sm"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {renderFields(node, onChange)}
    </div>
  );
}

function renderFields(node: StudioNode, onChange: (data: Partial<StudioNode["data"]>) => void) {
  if (node.type === "prompt") {
    return (
      <textarea
        value={node.data.prompt ?? ""}
        onChange={(event) => onChange({ prompt: event.target.value })}
        rows={2}
        className={`${compactField} min-h-[44px] resize-none`}
        placeholder="Prompt..."
        autoFocus
      />
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
        <textarea
          value={node.data.prompt ?? ""}
          onChange={(event) => onChange({ prompt: event.target.value })}
          rows={2}
          className={`${compactField} min-h-[44px] resize-none`}
          placeholder="Character brief..."
          autoFocus
        />
      </div>
    );
  }

  if (node.type === "image" || node.type === "video") {
    return (
      <textarea
        value={node.data.prompt ?? ""}
        onChange={(event) => onChange({ prompt: event.target.value })}
        rows={2}
        className={`${compactField} min-h-[44px] resize-none`}
        placeholder={node.type === "image" ? "Image prompt..." : "Video prompt..."}
        autoFocus
      />
    );
  }

  if (node.type === "audio") {
    return (
      <div className="space-y-2">
        <textarea
          value={node.data.prompt ?? ""}
          onChange={(event) => onChange({ prompt: event.target.value })}
          rows={2}
          className={`${compactField} min-h-[44px] resize-none`}
          placeholder="Speech script..."
          autoFocus
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

  return null;
}
