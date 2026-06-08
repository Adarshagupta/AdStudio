import type { ReactNode } from "react";
import { Suspense } from "react";

import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
