import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getCurrentUser } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/dashboard");
  }

  return <ResetPasswordForm token={params.token} />;
}
