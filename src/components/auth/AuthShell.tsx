import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const AuthVisualPanel = dynamic(
  () => import("@/components/auth/AuthVisualPanel").then((mod) => mod.AuthVisualPanel),
  { ssr: false, loading: () => null },
);

export function AuthShell({
  children,
  layout = "centered",
}: {
  children: ReactNode;
  layout?: "centered" | "fill";
}) {
  const fillHeight = layout === "fill";

  return (
    <div className="auth-viewport-lock relative h-dvh max-h-dvh w-full overflow-hidden">
      <div className="auth-page-bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 grid h-full w-full grid-cols-1 overflow-hidden lg:grid-cols-[0.94fr_1.06fr]">
        <AuthVisualPanel />

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6 lg:px-10 xl:px-12",
              !fillHeight && "justify-center",
            )}
          >
            <div className={cn("w-full", fillHeight && "flex min-h-0 flex-1 flex-col")}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
