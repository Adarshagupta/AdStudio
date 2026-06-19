"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      gap={10}
      visibleToasts={5}
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl border border-border bg-card text-foreground shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          title: "text-sm font-medium",
          description: "text-sm text-zinc-600",
          actionButton: "bg-zinc-900 text-white",
          cancelButton: "bg-zinc-100 text-zinc-700",
        },
      }}
    />
  );
}
