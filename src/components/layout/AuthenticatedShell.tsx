import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/PageShell";
import { requireCurrentUser } from "@/lib/auth";
import { isWorkspaceOnboardingCompleteCached } from "@/lib/onboarding-gate";

export async function AuthenticatedShell({
  children,
  fullscreen = false,
}: {
  children: ReactNode;
  fullscreen?: boolean;
}) {
  const currentUser = await requireCurrentUser();
  const pathname = headers().get("x-pathname") ?? "";

  const onboardingComplete = await isWorkspaceOnboardingCompleteCached(currentUser.workspace.id);
  if (!onboardingComplete && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  const isChat = !fullscreen && pathname.startsWith("/dashboard/chat");

  return (
    <PageShell
      user={currentUser.user}
      workspace={currentUser.workspace}
      fullWidth={isChat}
      hideTopbar={isChat}
      fullscreen={fullscreen}
    >
      {children}
    </PageShell>
  );
}
