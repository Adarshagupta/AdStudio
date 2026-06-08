import type { ReactNode } from "react";

import { NotificationProvider } from "@/components/layout/NotificationProvider";
import { ShellLayout } from "@/components/layout/ShellLayout";

export function PageShell({
  children,
  user,
  workspace,
  fullWidth = false,
  fullscreen = false,
  hideTopbar = false,
}: {
  children: ReactNode;
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    id: string;
    name: string;
    plan: string;
    creditsRemaining: number;
  };
  fullWidth?: boolean;
  fullscreen?: boolean;
  hideTopbar?: boolean;
}) {
  if (fullscreen) {
    return (
      <NotificationProvider>
        <div className="relative h-screen w-screen overflow-hidden bg-[#fcfcfc]">
          {children}
        </div>
      </NotificationProvider>
    );
  }

  return (
    <ShellLayout
      user={user}
      workspace={workspace}
      fullWidth={fullWidth}
      hideTopbar={hideTopbar}
    >
      {children}
    </ShellLayout>
  );
}
