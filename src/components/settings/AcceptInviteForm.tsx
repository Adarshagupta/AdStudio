"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

export function AcceptInviteForm({
  email,
  token,
  workspaceName,
  hasExistingAccount = false,
  alreadyMember = false,
  canJoinSignedIn = false,
}: {
  email: string;
  token: string;
  workspaceName: string;
  hasExistingAccount?: boolean;
  alreadyMember?: boolean;
  canJoinSignedIn?: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitInvite(body: Record<string, string | undefined>) {
    const response = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      throw new Error(responseErrorMessage(response, data, "Could not accept invite."));
    }

    notify.success(`Joined ${workspaceName}.`);
    router.push("/dashboard");
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await submitInvite({
        name: hasExistingAccount ? undefined : String(formData.get("name") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not accept invite.");
      setIsSubmitting(false);
    }
  }

  async function joinWhileSignedIn() {
    setIsSubmitting(true);

    try {
      await submitInvite({});
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not accept invite.");
      setIsSubmitting(false);
    }
  }

  if (alreadyMember) {
    return (
      <InviteCard workspaceName={workspaceName}>
        <p className="text-sm text-muted-foreground">You already have access to this workspace.</p>
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Open workspace
        </Button>
      </InviteCard>
    );
  }

  if (canJoinSignedIn) {
    return (
      <InviteCard workspaceName={workspaceName}>
        <p className="text-sm text-muted-foreground">
          Join <span className="font-medium text-foreground">{workspaceName}</span> with your signed-in account.
        </p>
        <Button className="w-full" disabled={isSubmitting} onClick={joinWhileSignedIn}>
          {isSubmitting ? "Joining…" : "Join workspace"}
        </Button>
      </InviteCard>
    );
  }

  return (
    <InviteCard workspaceName={workspaceName}>
      <p className="text-sm leading-6 text-muted-foreground">
        {hasExistingAccount
          ? "Sign in with your password to add this workspace to your account."
          : "Create your account to join this workspace."}
      </p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-email">
            Email
          </label>
          <Input id="invite-email" value={email} disabled />
        </div>
        {!hasExistingAccount ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
              Name
            </label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
            {hasExistingAccount ? "Password" : "Create password"}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={hasExistingAccount ? "current-password" : "new-password"}
          />
        </div>
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Joining…" : hasExistingAccount ? "Join with existing account" : "Create account"}
        </Button>
      </form>
    </InviteCard>
  );
}

function InviteCard({
  workspaceName,
  children,
}: {
  workspaceName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium">Join {workspaceName}</h1>
          </div>
        </div>
        {children}
      </Card>
    </div>
  );
}













