"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginPasswordForm } from "@/components/auth/LoginPasswordForm";
import { RememberedAccountsPicker } from "@/components/auth/RememberedAccountsPicker";
import {
  AuthDivider,
  AuthField,
  AuthFormPanel,
  authInputClass,
  authLinkClassName,
  authOutlineButtonClass,
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function postAuthPath(onboardingComplete?: boolean) {
  if (onboardingComplete === false) return "/onboarding";
  return getPostAuthRedirectPath();
}

type LoginStep = "picker" | "password" | "form";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
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

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, email, password }),
      });

      const data = await readJsonResponse<{
        error?: string;
        requiresVerification?: boolean;
        emailError?: string;
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
            {isSignup ? "Already have an account?" : "New to Ad Studio?"}{" "}
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
          <Button
            type="button"
            variant="outline"
            className={authOutlineButtonClass}
            onClick={() => notify.info("Google sign-in is coming soon.")}
          >
            <GoogleIcon />
            Google
          </Button>
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-400">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </AuthFormPanel>
    </AuthShell>
  );
}
