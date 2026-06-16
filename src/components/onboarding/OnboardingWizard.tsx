"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthBrandHeader, authInputClass, authPrimaryButtonClass } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  companySizeOptions,
  hearAboutOptions,
  monthlyAdSpendOptions,
  type HearAboutSource,
} from "@/lib/onboarding";
import { getPostAuthRedirectPath } from "@/lib/dashboard-chat";
import { clearMembersNavHint, queueMembersNavHint } from "@/lib/members-nav-hint";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type CompanySize = (typeof companySizeOptions)[number]["value"];
type MonthlyAdSpend = (typeof monthlyAdSpendOptions)[number]["value"];

type OnboardingState = {
  completed: boolean;
  workspaceName: string;
  companyName: string;
  companySize: CompanySize | null;
  monthlyAdSpend: MonthlyAdSpend | null;
  hearAboutSource: HearAboutSource | null;
  hearAboutOther: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  preset: "creator" | "viewer" | "analyst";
};

const invitePresets = [
  { id: "creator" as const, label: "Creator", description: "Create videos and manage assets" },
  { id: "viewer" as const, label: "Viewer", description: "View library only" },
  { id: "analyst" as const, label: "Analyst", description: "View library and analytics" },
];

function newInviteRow(): InviteRow {
  return { id: crypto.randomUUID(), email: "", preset: "creator" };
}

function OptionCard({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition sm:px-4 sm:py-3",
        selected
          ? "border-violet-500 bg-violet-50 text-violet-900 shadow-sm"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-200",
      )}
    >
      {label}
    </button>
  );
}

export function OnboardingWizard({ initial }: { initial: OnboardingState }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companySize, setCompanySize] = useState<CompanySize | null>(initial.companySize);
  const [monthlyAdSpend, setMonthlyAdSpend] = useState<MonthlyAdSpend | null>(initial.monthlyAdSpend);
  const [hearAboutSource, setHearAboutSource] = useState<HearAboutSource | null>(
    (initial.hearAboutSource as HearAboutSource | null) ?? null,
  );
  const [hearAboutOther, setHearAboutOther] = useState(initial.hearAboutOther ?? "");
  const [invites, setInvites] = useState<InviteRow[]>([newInviteRow()]);

  useEffect(() => {
    if (initial.completed) {
      router.replace(getPostAuthRedirectPath());
    }
  }, [initial.completed, router]);

  async function saveProgress(partial: Record<string, unknown>) {
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const data = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      throw new Error(responseErrorMessage(response, data, "Could not save progress."));
    }
  }

  async function goNext() {
    if (step === 0) {
      if (!companyName.trim()) {
        notify.error("Enter your company name.");
        return;
      }
      if (!companySize) {
        notify.error("Select your company size.");
        return;
      }
      setIsBusy(true);
      try {
        await saveProgress({ companyName: companyName.trim(), companySize });
        setStep(1);
      } catch (err) {
        notify.error(err instanceof Error ? err.message : "Could not save.");
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (step === 1) {
      if (!monthlyAdSpend) {
        notify.error("Select your monthly ad spend.");
        return;
      }
      if (!hearAboutSource) {
        notify.error("Tell us how you heard about LiteMoov.");
        return;
      }
      if (hearAboutSource === "other" && !hearAboutOther.trim()) {
        notify.error("Tell us where you heard about LiteMoov.");
        return;
      }
      setIsBusy(true);
      try {
        await saveProgress({
          companyName: companyName.trim(),
          companySize,
          monthlyAdSpend,
          hearAboutSource,
          hearAboutOther: hearAboutSource === "other" ? hearAboutOther.trim() : undefined,
        });
        setStep(2);
      } catch (err) {
        notify.error(err instanceof Error ? err.message : "Could not save.");
      } finally {
        setIsBusy(false);
      }
    }
  }

  async function finish(skipInvites = false) {
    setIsBusy(true);

    try {
      const completeRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complete: true,
          companyName: companyName.trim(),
          companySize,
          monthlyAdSpend,
          hearAboutSource,
          hearAboutOther: hearAboutSource === "other" ? hearAboutOther.trim() : undefined,
        }),
      });
      const completeData = await readJsonResponse<{ error?: string }>(completeRes);

      if (!completeRes.ok) {
        throw new Error(
          responseErrorMessage(completeRes, completeData, "Could not complete onboarding."),
        );
      }

      const pendingInvites = skipInvites
        ? []
        : invites
            .map((row) => ({ email: row.email.trim(), preset: row.preset }))
            .filter((row) => row.email.length > 0);

      if (pendingInvites.length > 0) {
        const inviteRes = await fetch("/api/onboarding/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invites: pendingInvites }),
        });
        const inviteData = await readJsonResponse<{
          error?: string;
          sent?: { email: string; emailError?: string | null }[];
        }>(inviteRes);

        if (!inviteRes.ok) {
          throw new Error(
            responseErrorMessage(inviteRes, inviteData, "Onboarding saved but invites failed."),
          );
        }

        clearMembersNavHint();
        const emailFailures = inviteData.sent?.filter((item) => item.emailError) ?? [];
        if (emailFailures.length > 0) {
          notify.info(
            `Workspace ready. ${emailFailures.length} invite email(s) could not be sent — share links from Team settings.`,
          );
        } else {
          notify.success(`Workspace ready. ${inviteData.sent?.length ?? 0} invite(s) sent.`);
        }
      } else {
        if (skipInvites) {
          queueMembersNavHint();
        }
        notify.success("You're all set.");
      }

      router.push(getPostAuthRedirectPath());
      router.refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not finish onboarding.");
    } finally {
      setIsBusy(false);
    }
  }

  const stepTitles = ["About your company", "About you", "Invite your team"];

  return (
    <AuthShell layout="fill">
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col">
        <header className="shrink-0 space-y-2">
          <AuthBrandHeader />
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Step {step + 1} of 3
          </p>
          <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            {stepTitles[step]}
          </h1>
          <p className="text-sm leading-snug text-zinc-500">
            Please fill out the form to help us offer the best product for you.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
        {step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-zinc-800">
                Company
              </label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Your company"
                className={authInputClass}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-800">Company size</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {companySizeOptions.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    selected={companySize === option.value}
                    onClick={() => setCompanySize(option.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-800">Monthly ad spend in $</p>
              <div className="grid grid-cols-2 gap-2">
                {monthlyAdSpendOptions.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    selected={monthlyAdSpend === option.value}
                    onClick={() => setMonthlyAdSpend(option.value)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-800">Where did you first hear about LiteMoov?</p>
              <div className="grid gap-2">
                {hearAboutOptions.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    selected={hearAboutSource === option.value}
                    onClick={() => setHearAboutSource(option.value)}
                  />
                ))}
              </div>
            </div>
            {hearAboutSource === "other" ? (
              <div className="space-y-2">
                <label htmlFor="hearAboutOther" className="text-sm font-medium text-zinc-800">
                  Other
                </label>
                <Input
                  id="hearAboutOther"
                  value={hearAboutOther}
                  onChange={(event) => setHearAboutOther(event.target.value)}
                  placeholder="e.g. a podcast or newsletter"
                  className={authInputClass}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Invite teammates by email. Choose what they can do in your workspace.
            </p>
            {invites.map((row, index) => (
              <div
                key={row.id}
                className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Member {index + 1}
                  </p>
                  {invites.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setInvites((items) => items.filter((item) => item.id !== row.id))}
                      className="text-zinc-400 hover:text-zinc-700"
                      aria-label="Remove invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <Input
                  type="email"
                  value={row.email}
                  onChange={(event) =>
                    setInvites((items) =>
                      items.map((item) =>
                        item.id === row.id ? { ...item, email: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="colleague@company.com"
                  className={authInputClass}
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  {invitePresets.map((preset) => (
                    <OptionCard
                      key={preset.id}
                      label={preset.label}
                      selected={row.preset === preset.id}
                      onClick={() =>
                        setInvites((items) =>
                          items.map((item) =>
                            item.id === row.id ? { ...item, preset: preset.id } : item,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setInvites((items) => [...items, newInviteRow()])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another email
            </Button>
          </div>
        ) : null}
        </div>

        <footer className="shrink-0 border-t border-zinc-100/80 bg-[#fcfcfc]/80 pt-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isBusy}
              onClick={() => setStep((value) => value - 1)}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button type="button" className={authPrimaryButtonClass} disabled={isBusy} onClick={goNext}>
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={isBusy}
                onClick={() => finish(true)}
              >
                Skip for now
              </Button>
              <Button
                type="button"
                className={authPrimaryButtonClass}
                disabled={isBusy}
                onClick={() => finish(false)}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}
        </div>
        </footer>
      </div>
    </AuthShell>
  );
}
