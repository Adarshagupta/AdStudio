"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        requiresVerification?: boolean;
        emailError?: string;
      };
      const email = String(payload.email ?? "");
      setLastEmail(email);

      if (!response.ok) {
        if (data.requiresVerification) {
          setMessage(data.error ?? "Verify your email before signing in.");
          setIsSubmitting(false);
          return;
        }

        throw new Error(data.error ?? "Authentication failed.");
      }

      if (data.requiresVerification) {
        setMessage(
          data.emailError
            ? `Account created, but email delivery failed: ${data.emailError}`
            : "Check your email to verify your account before signing in.",
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!lastEmail) return;
    setError(null);
    setMessage(null);
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lastEmail }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not resend verification.");
      }

      setMessage("Verification email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend verification.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md space-y-6 bg-white p-6">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-200 bg-purple-100 text-sm font-medium text-purple-950">
            UG
          </div>
          <div>
            <h1 className="text-xl font-medium">{isSignup ? "Create your workspace" : "Sign in"}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {isSignup
                ? "Start generating UGC ads with your own account and database-backed workspace."
                : "Use your account to access your workspace and generations."}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {isSignup ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
                  Name
                </label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="workspaceName">
                  Workspace
                </label>
                <Input id="workspaceName" name="workspaceName" required placeholder="Your company or team" />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          <Button className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          {!isSignup ? (
            <Link className="font-medium text-purple-700 hover:text-purple-800" href="/forgot-password">
              Forgot password?
            </Link>
          ) : null}
          {lastEmail && message?.toLowerCase().includes("verification") ? (
            <div>
              <button
                className="font-medium text-purple-700 hover:text-purple-800 disabled:opacity-60"
                disabled={isResending}
                onClick={resendVerification}
                type="button"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          ) : null}
          <p>
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link className="font-medium text-purple-700 hover:text-purple-800" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create one"}
          </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
