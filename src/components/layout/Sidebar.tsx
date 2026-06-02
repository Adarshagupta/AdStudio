"use client";

import { UniversalNav } from "@/components/layout/UniversalNav";

export function Sidebar({
  user,
  workspace,
}: {
  user: {
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    plan: string;
    creditsRemaining: number;
  };
}) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[220px] bg-[#fcfcfc] md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-sm font-semibold text-purple-900">
          A
        </div>
        <p className="font-display text-lg font-semibold tracking-tight text-zinc-900">Ad Studio</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <UniversalNav user={user} />
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-zinc-100/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-900">Credits</p>
            <p className="text-xs text-zinc-500">{workspace.plan}</p>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-zinc-200/80">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, workspace.creditsRemaining * 4))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {workspace.creditsRemaining} generations left
          </p>
        </div>
      </div>
    </aside>
  );
}
