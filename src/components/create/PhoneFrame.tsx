import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex aspect-[9/16] w-[280px] max-w-full flex-col overflow-hidden rounded-[2rem] border-[3px] border-zinc-900 bg-zinc-950 p-2">
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-zinc-700" />
      <div className="min-h-0 flex-1 overflow-hidden rounded-[1.45rem] bg-zinc-900">
        {children}
      </div>
    </div>
  );
}
