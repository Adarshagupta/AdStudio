"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import {
  AuthField,
  AuthFormPanel,
  authLinkClassName,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  getAccountAvatarColor,
  getAccountInitials,
  type RememberedAccount,
} from "@/lib/remembered-accounts";

export function LoginPasswordForm({
  account,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  account: RememberedAccount;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const displayName = account.name?.trim() || account.email.split("@")[0] || "Account";

  return (
    <AuthFormPanel
      title="Welcome back"
      subtitle={
        <>
          New to LiteMoov?{" "}
          <Link href="/signup" className={authLinkClassName()}>
            Sign up free
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-1 flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        All accounts
      </button>

      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3">
        <Avatar className="h-11 w-11" style={{ backgroundColor: getAccountAvatarColor(account.email) }}>
          <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
            {getAccountInitials(account.name, account.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
          <p className="truncate text-sm text-zinc-500">{account.email}</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <input type="hidden" name="email" value={account.email} />

        <AuthField label="Password" htmlFor="password">
          <AuthPasswordInput
            id="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Your password"
          />
        </AuthField>

        <div className="flex justify-end">
          <Link href="/forgot-password" className={authLinkClassName("text-sm")}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={isSubmitting} className={authPrimaryButtonClass}>
          {isSubmitting ? "Signing in…" : "Continue"}
        </Button>
      </form>
    </AuthFormPanel>
  );
}
