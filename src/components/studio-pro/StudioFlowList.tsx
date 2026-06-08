"use client";

import Link from "next/link";

import { StudioSessionName } from "@/components/studio-pro/StudioSessionName";
import { formatDateTime } from "@/lib/format-date";

type StudioFlowListItem = {
  id: string;
  name: string;
  updatedAt: string;
};

export function StudioFlowList({ flows }: { flows: StudioFlowListItem[] }) {
  return (
    <div className="grid gap-3">
      {flows.map((flow) => (
        <div
          key={flow.id}
          className="group flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition hover:shadow-[0_12px_40px_rgba(124,58,237,0.08)]"
        >
          <div className="min-w-0 flex-1">
            <StudioSessionName flowId={flow.id} initialName={flow.name} variant="list" />
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(flow.updatedAt)} · {flow.id.slice(0, 8)}
            </p>
          </div>
          <Link
            href={`/studio-pro/${flow.id}`}
            className="shrink-0 text-sm text-purple-600 opacity-0 transition group-hover:opacity-100"
          >
            Open →
          </Link>
        </div>
      ))}
    </div>
  );
}
