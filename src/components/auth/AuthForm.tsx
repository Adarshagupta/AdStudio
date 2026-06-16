"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { LoginPasswordForm } from "@/components/auth/LoginPasswordForm";
import { RememberedAccountsPicker } from "@/components/auth/RememberedAccountsPicker";
import {
  AuthDivider,
  AuthField,
  AuthFormPanel,
  authInputClass,
  authLinkClassName,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatValidationErrors, readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { getPostAuthRedirectPath } from "@/lib/dashboard-chat";
import { notify } from "@/lib/notify";
import {
  clearRememberedAccounts,
  listRememberedAccounts,
  rememberAccount,
  removeRememberedAccount,
  type RememberedAccount,
} from "@/lib/remembered-accounts";

function getGoogleAuthErrorMessage(error: string | null, message: string | null) {
  if (error === "google_denied") return "Google sign-in was cancelled.";
  if (error === "google_state") return "Your Google sign-in session expired. Try again.";
  if (error === "google_missing_code") return "Google did not return an authorization code. Try again.";
  if (error === "google_failed" && message) return message;
  if (error === "google_failed") return "Google sign-in failed. Try again.";
  return null;
}

function postAuthPath(onboardingComplete?: boolean) {
  if (onboardingComplete === false) return "/onboarding";
  return getPostAuthRedirectPath();
}

type LoginStep = "picker" | "password" | "form";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lastEmail, setLastEmail] = useState("");
  const [showVerificationActions, setShowVerificationActions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const [loginStep, setLoginStep] = useState<LoginStep>("form");
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount | null>(null);
  const isSignup = mode === "signup";

  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    const authError = getGoogleAuthErrorMessage(error, message);

    if (authError) {
      notify.error(authError);
      router.replace(isSignup ? "/signup" : "/login");
    }
  }, [isSignup, router, searchParams]);

  useEffect(() => {
    if (isSignup) {
      return;
    }

    const accounts = listRememberedAccounts();
    setRememberedAccounts(accounts);
    if (accounts.length > 0) {
      setLoginStep("picker");
    }
  }, [isSignup]);

  function refreshRememberedAccounts(nextStep?: LoginStep) {
    const accounts = listRememberedAccounts();
    setRememberedAccounts(accounts);

    if (nextStep) {
      setLoginStep(nextStep);
      return;
    }

    if (accounts.length === 0) {
      setLoginStep("form");
      setSelectedAccount(null);
      return;
    }

    setLoginStep("picker");
    setSelectedAccount(null);
  }

  async function completeLogin(data: {
    email: string;
    name?: string | null;
    onboardingComplete?: boolean;
  }) {
    if (rememberMe) {
      rememberAccount({ email: data.email, name: data.name ?? null });
    }

    notify.success("Signed in.");
    router.push(postAuthPath(data.onboardingComplete));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowVerificationActions(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const referralFromUrl = searchParams.get("ref");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          email,
          password,
          ...(isSignup && referralFromUrl ? { referralCode: referralFromUrl } : {}),
        }),
      });

      const data = await readJsonResponse<{
        error?: string;
        requiresVerification?: boolean;
        emailError?: string;
        useGoogle?: boolean;
        onboardingComplete?: boolean;
        user?: {
          email?: string;
          name?: string | null;
        };
        errors?: {
          fieldErrors?: Record<string, string[]>;
          formErrors?: string[];
        };
      }>(response);
      setLastEmail(email);

      if (!response.ok) {
        if (data.requiresVerification) {
          setShowVerificationActions(true);
          notify.info(data.error ?? "Verify your email before signing in.");
          setIsSubmitting(false);
          return;
        }

        if (data.useGoogle) {
          notify.info(data.error ?? "Continue with Google to sign in.");
          setIsSubmitting(false);
          return;
        }

        const message =
          data.error ??
          (data.errors ? formatValidationErrors(data.errors, "Authentication failed.") : null) ??
          responseErrorMessage(response, data, "Authentication failed.");
        throw new Error(message);
      }

      if (data.requiresVerification) {
        setShowVerificationActions(true);
        notify.info(
          data.emailError
            ? `Account created, but email delivery failed: ${data.emailError}`
            : "Check your email to verify your account before signing in.",
        );
        setIsSubmitting(false);
        return;
      }

      if (isSignup) {
        notify.success("Account created.");
        router.push(postAuthPath(data.onboardingComplete));
        return;
      }

      await completeLogin({
        email: data.user?.email ?? email,
        name: data.user?.name ?? selectedAccount?.name ?? null,
        onboardingComplete: data.onboardingComplete,
      });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Authentication failed.");
      setIsSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!lastEmail) return;
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lastEmail }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not resend verification."));
      }

      notify.success("Verification email sent.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not resend verification.");
    } finally {
      setIsResending(false);
    }
  }

  if (!isSignup && loginStep === "picker" && rememberedAccounts.length > 0) {
    return (
      <AuthShell>
        <RememberedAccountsPicker
          accounts={rememberedAccounts}
          isSubmitting={isSubmitting}
          onContinue={(account) => {
            setSelectedAccount(account);
            setLoginStep("password");
          }}
          onAnotherAccount={() => setLoginStep("form")}
          onRemoveAccount={(email) => {
            removeRememberedAccount(email);
            refreshRememberedAccounts();
          }}
          onClearAccounts={() => {
            clearRememberedAccounts();
            refreshRememberedAccounts("form");
          }}
        />
      </AuthShell>
    );
  }

  if (!isSignup && loginStep === "password" && selectedAccount) {
    return (
      <AuthShell>
        <LoginPasswordForm
          account={selectedAccount}
          isSubmitting={isSubmitting}
          onBack={() => refreshRememberedAccounts("picker")}
          onSubmit={onSubmit}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthFormPanel
        title={isSignup ? "Create your account" : "Welcome back"}
        subtitle={
          <>
            {isSignup ? "Already have an account?" : "New to LiteMoov?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"} className={authLinkClassName()}>
              {isSignup ? "Log in" : "Sign up free"}
            </Link>
          </>
        }
      >
        {!isSignup && rememberedAccounts.length > 0 ? (
          <button
            type="button"
            onClick={() => refreshRememberedAccounts("picker")}
            className="text-sm font-medium text-violet-600 transition hover:text-violet-800"
          >
            ← Back to saved accounts
          </button>
        ) : null}
        <form className="space-y-3.5 sm:space-y-4" onSubmit={onSubmit}>
          {isSignup ? (
            <>
              <AuthField label="Name" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  className={authInputClass}
                />
              </AuthField>
              <AuthField label="Workspace" htmlFor="workspaceName">
                <Input
                  id="workspaceName"
                  name="workspaceName"
                  required
                  placeholder="Company or team name"
                  className={authInputClass}
                />
              </AuthField>
            </>
          ) : null}

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

          <AuthField label="Password" htmlFor="password">
            <AuthPasswordInput
              id="password"
              name="password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
            />
          </AuthField>

          {!isSignup ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2.5 text-zinc-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-400"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className={authLinkClassName("text-sm")}>
                Forgot password?
              </Link>
            </div>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className={authPrimaryButtonClass}>
            {isSubmitting ? "Working…" : isSignup ? "Create account" : "Log in"}
          </Button>
        </form>

        {!isSignup && lastEmail && showVerificationActions ? (
          <p className="text-center text-sm text-zinc-500">
            <button
              className={authLinkClassName("disabled:opacity-60")}
              disabled={isResending}
              onClick={resendVerification}
              type="button"
            >
              {isResending ? "Sending…" : "Resend verification email"}
            </button>
          </p>
        ) : null}

        {isSignup && lastEmail && showVerificationActions ? (
          <p className="text-center text-sm text-zinc-500">
            <button
              className={authLinkClassName("disabled:opacity-60")}
              disabled={isResending}
              onClick={resendVerification}
              type="button"
            >
              {isResending ? "Sending…" : "Resend verification email"}
            </button>
          </p>
        ) : null}

        <div className="space-y-3">
          <AuthDivider label={isSignup ? "or sign up with" : "or continue with"} />
          <GoogleAuthButton intent={isSignup ? "signup" : "login"} disabled={isSubmitting} />
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-400">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </AuthFormPanel>
    </AuthShell>
  );
}
