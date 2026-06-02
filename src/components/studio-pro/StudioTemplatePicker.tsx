"use client";

import { LayoutTemplate, Sparkles } from "lucide-react";

import { studioTemplates, type StudioTemplate } from "@/lib/studio-pro/templates";
import { cn } from "@/lib/utils";

export function StudioTemplatePicker({
  onSelect,
  onStartBlank,
  replacing = false,
}: {
  onSelect: (template: StudioTemplate) => void;
  onStartBlank: () => void;
  replacing?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-zinc-900/10 p-6 backdrop-blur-[2px]">
      <div className="pointer-events-auto w-full max-w-3xl rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
            <LayoutTemplate className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-zinc-900">Choose a starting point</p>
            <p className="mt-1 text-sm text-zinc-500">
              {replacing
                ? "Selecting a template replaces your current canvas layout. Content fields stay empty."
                : "Pick a prebuilt flow layout or start with a blank canvas. You fill in all content."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {studioTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="group rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 text-left transition hover:border-purple-200 hover:bg-white hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)]"
            >
              <div className={cn("mb-3 h-1.5 rounded-full bg-gradient-to-r", template.accent)} />
              <p className="text-sm font-medium text-zinc-900">{template.name}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{template.description}</p>
              <p className="mt-3 text-[11px] text-purple-600 opacity-0 transition group-hover:opacity-100">
                Use template →
              </p>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStartBlank}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Sparkles className="h-4 w-4" />
          {replacing ? "Keep current canvas" : "Start blank canvas"}
        </button>
      </div>
    </div>
  );
}
