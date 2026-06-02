import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function PageShell({
  children,
  user,
  workspace,
  fullWidth = false,
  fullscreen = false,
}: {
  children: ReactNode;
  user: {
    name: string | null;
    email: string;
    role: "ADMIN" | "MEMBER";
    permissions?: unknown;
  };
  workspace: {
    name: string;
    plan: string;
    creditsRemaining: number;
  };
  fullWidth?: boolean;
  fullscreen?: boolean;
}) {
  if (fullscreen) {
    return <div className="h-screen w-screen overflow-hidden bg-[#fcfcfc]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <Sidebar user={user} workspace={workspace} />
      <div className="min-h-screen md:pl-[220px]">
        <Topbar user={user} workspace={workspace} />
        <main
          className={
            fullWidth
              ? "flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
              : "mx-auto max-w-6xl px-4 pb-10 pt-2 md:px-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
