import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { LiteMoovPreloader } from "@/components/brand/LiteMoovPreloader";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function FullscreenLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LiteMoovPreloader fullscreen />}>
      <AuthenticatedShell fullscreen>{children}</AuthenticatedShell>
    </Suspense>
  );
}
