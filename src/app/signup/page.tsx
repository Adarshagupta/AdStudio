import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LiteMoovPreloader } from "@/components/brand/LiteMoovPreloader";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default async function SignupPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={<LiteMoovPreloader fullscreen />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
