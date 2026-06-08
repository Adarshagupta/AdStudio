"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthField,
  AuthFormPanel,
  authLinkClassName,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      notify.error("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not reset password."));
      }

      notify.success("Password updated. Sign in with your new password.");
      router.push("/login");
      router.refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not reset password.");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AuthFormPanel
        title="Choose a new password"
        subtitle="Use at least 8 characters. You will log in with this password next time."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthField label="New password" htmlFor="password">
            <AuthPasswordInput
              id="password"
              name="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </AuthField>
          <AuthField label="Confirm password" htmlFor="confirmPassword">
            <AuthPasswordInput
              id="confirmPassword"
              name="confirmPassword"
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
          </AuthField>
          <Button type="submit" disabled={isSubmitting} className={authPrimaryButtonClass}>
            {isSubmitting ? "Saving…" : "Update password"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className={authLinkClassName()}>
            Back to log in
          </Link>
        </p>
      </AuthFormPanel>
    </AuthShell>
  );
}
