"use client";

import { FileText, Image as ImageIcon, Play, Workflow } from "lucide-react";

export function StudioProMiniIllustration() {
  return (
    <div
      className="studio-pro-mini-illustration relative h-[128px] overflow-hidden rounded-xl border border-zinc-200 bg-[#fcfcfc] shadow-inner"
      aria-hidden
    >
      <div className="absolute left-0 top-0 flex h-6 w-[26%] items-center gap-1 border-b border-r border-zinc-100 bg-white px-1.5">
        <Workflow className="h-2.5 w-2.5 text-zinc-600" />
        <span className="text-[7px] font-semibold text-zinc-800">Studio Pro</span>
      </div>

      <div className="absolute bottom-0 left-0 top-6 w-[26%] border-r border-zinc-100 bg-white">
        <div className="flex h-4 items-center border-b border-zinc-100 px-1.5">
          <span className="text-[6px] font-medium text-zinc-500">Agent</span>
        </div>
        <div className="space-y-1 p-1.5">
          <div className="studio-mini-chat-user ml-auto h-2 w-[72%] rounded-full bg-zinc-800" />
          <div className="studio-mini-chat-assistant h-2 w-[84%] rounded-full bg-zinc-100" />
          <div className="studio-mini-chat-assistant-delay h-2 w-[58%] rounded-full bg-zinc-100" />
        </div>
      </div>

      <div className="absolute bottom-0 left-[26%] right-0 top-6 overflow-hidden">
        <div className="studio-mini-grid absolute inset-0" />

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 220 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M 52 42 C 78 42, 82 52, 108 52"
            className="studio-mini-edge"
            fill="none"
            strokeWidth="1.5"
          />
          <path
            d="M 132 52 C 158 52, 162 38, 188 38"
            className="studio-mini-edge studio-mini-edge-delay"
            fill="none"
            strokeWidth="1.5"
          />
        </svg>

        <div className="studio-mini-node studio-mini-node-1 absolute left-[6%] top-[18%] w-[22%] rounded-md border border-zinc-200 bg-white p-1 shadow-sm">
          <div className="mb-0.5 flex items-center gap-0.5">
            <FileText className="h-2 w-2 text-zinc-500" />
            <span className="text-[6px] font-medium text-zinc-800">Script</span>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full rounded-full bg-zinc-100" />
            <div className="h-1 w-[80%] rounded-full bg-zinc-100" />
          </div>
        </div>

        <div className="studio-mini-node studio-mini-node-2 absolute left-[38%] top-[32%] w-[24%] rounded-md border border-zinc-200 bg-white p-1 shadow-sm">
          <div className="mb-0.5 flex items-center gap-0.5">
            <ImageIcon className="h-2 w-2 text-zinc-500" />
            <span className="text-[6px] font-medium text-zinc-800">Image</span>
          </div>
          <div className="relative h-7 overflow-hidden rounded bg-zinc-100">
            <div className="studio-mini-shimmer absolute inset-0" />
          </div>
        </div>

        <div className="studio-mini-node studio-mini-node-3 absolute right-[6%] top-[14%] w-[22%] rounded-md border border-zinc-200 bg-white p-1 shadow-sm">
          <div className="mb-0.5 flex items-center gap-0.5">
            <Play className="h-2 w-2 text-zinc-500" />
            <span className="text-[6px] font-medium text-zinc-800">Video</span>
          </div>
          <div className="relative flex h-8 items-center justify-center overflow-hidden rounded bg-zinc-900/90">
            <div className="studio-mini-shimmer absolute inset-0 opacity-60" />
            <Play className="relative h-2.5 w-2.5 fill-white/80 text-white/80" />
          </div>
        </div>

        <div className="studio-mini-cursor absolute left-[54%] top-[58%] h-2 w-2 rounded-full border border-white bg-zinc-800 shadow-sm" />
      </div>
    </div>
  );
}
