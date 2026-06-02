import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { requireCurrentUser } from "@/lib/auth";

type CurrentUser = Awaited<ReturnType<typeof requireCurrentUser>>;

export async function ProtectedShell({
  children,
  currentUser,
  fullWidth = false,
  fullscreen = false,
}: {
  children: ReactNode;
  currentUser?: CurrentUser;
  fullWidth?: boolean;
  fullscreen?: boolean;
}) {
  const session = currentUser ?? (await requireCurrentUser());

  return (
    <PageShell
      user={session.user}
      workspace={session.workspace}
      fullWidth={fullWidth}
      fullscreen={fullscreen}
    >
      {children}
    </PageShell>
  );
}
