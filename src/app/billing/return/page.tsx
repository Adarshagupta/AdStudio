import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BillingReturnFlow } from "@/components/billing/BillingReturnFlow";
import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceOnboardingComplete } from "@/lib/onboarding";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default async function BillingReturnPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const onboardingComplete = await isWorkspaceOnboardingComplete(currentUser.workspace.id);

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f6f3]">
      <header className="flex justify-center px-6 py-8">
        <LiteMoovWordmark tone="light" size="lg" />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-2">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-[#e4e2de] bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-[#6b6965]">Loading…</p>
            </div>
          }
        >
          <BillingReturnFlow
            continueHref={onboardingComplete ? "/dashboard" : "/onboarding"}
            continueLabel={onboardingComplete ? "Start creating" : "Continue onboarding"}
          />
        </Suspense>
      </main>
    </div>
  );
}
