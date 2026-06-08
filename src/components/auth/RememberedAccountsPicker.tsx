"use client";

import { Plus, UserRound, X } from "lucide-react";

import {
  AuthBrandHeader,
  authOutlineButtonClass,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  getAccountAvatarColor,
  getAccountInitials,
  type RememberedAccount,
} from "@/lib/remembered-accounts";
import { cn } from "@/lib/utils";

function AccountCard({
  account,
  isLastUsed,
  isSubmitting,
  onContinue,
  onRemove,
}: {
  account: RememberedAccount;
  isLastUsed: boolean;
  isSubmitting: boolean;
  onContinue: () => void;
  onRemove: () => void;
}) {
  const displayName = account.name?.trim() || account.email.split("@")[0] || "Account";
  const initials = getAccountInitials(account.name, account.email);

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm shadow-zinc-900/5">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
        aria-label={`Remove ${displayName}`}
      >
        <X className="h-4 w-4" />
      </button>

      {isLastUsed ? (
        <span className="mb-3 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          Last used
        </span>
      ) : (
        <span className="mb-3 h-[22px]" aria-hidden />
      )}

      <Avatar className="h-16 w-16" style={{ backgroundColor: getAccountAvatarColor(account.email) }}>
        <AvatarFallback className="bg-transparent text-lg font-semibold text-white">
          {initials}
        </AvatarFallback>
      </Avatar>

      <p className="mt-4 max-w-full truncate text-center text-base font-semibold text-zinc-900">
        {displayName}
      </p>
      <p className="mt-0.5 max-w-full truncate text-center text-sm text-zinc-500">
        {account.email}
      </p>

      <Button
        type="button"
        disabled={isSubmitting}
        onClick={onContinue}
        className={cn(authPrimaryButtonClass, "mt-5")}
      >
        Continue
      </Button>
    </div>
  );
}

export function RememberedAccountsPicker({
  accounts,
  isSubmitting,
  onContinue,
  onAnotherAccount,
  onRemoveAccount,
  onClearAccounts,
}: {
  accounts: RememberedAccount[];
  isSubmitting: boolean;
  onContinue: (account: RememberedAccount) => void;
  onAnotherAccount: () => void;
  onRemoveAccount: (email: string) => void;
  onClearAccounts: () => void;
}) {
  const lastUsedEmail = accounts[0]?.email;

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <AuthBrandHeader />
        <div className="space-y-1 pt-1">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[1.65rem]">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500">Pick an account to continue.</p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          accounts.length > 1 ? "sm:grid-cols-2" : "max-w-[280px] mx-auto sm:mx-0",
        )}
      >
        {accounts.map((account) => (
          <AccountCard
            key={account.email}
            account={account}
            isLastUsed={account.email === lastUsedEmail}
            isSubmitting={isSubmitting}
            onContinue={() => onContinue(account)}
            onRemove={() => onRemoveAccount(account.email)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className={authOutlineButtonClass}
          onClick={onAnotherAccount}
        >
          <Plus className="h-4 w-4" />
          Continue with another account
        </Button>

        <button
          type="button"
          onClick={onClearAccounts}
          className="mx-auto flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-700"
        >
          <UserRound className="h-4 w-4" />
          Remove all accounts
        </button>
      </div>
    </div>
  );
}
