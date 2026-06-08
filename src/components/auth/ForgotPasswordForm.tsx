"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthField,
  AuthFormPanel,
  authInputClass,
  authLinkClassName,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not send reset email."));
      }

      notify.success("If an active account exists, a reset link has been sent.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AuthFormPanel
        title="Reset your password"
        subtitle="Enter the email on your account and we will send a secure reset link."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthField label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              className={authInputClass}
            />
          </AuthField>
          <Button type="submit" disabled={isSubmitting} className={authPrimaryButtonClass}>
            {isSubmitting ? "Sending…" : "Send reset link"}
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
