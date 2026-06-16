"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";

type ReferralSummary = {
  referralCode: string;
  referralUrl: string;
  creditsPerReferral: number;
  totalSignups: number;
  successfulReferrals: number;
  totalCreditsEarned: number;
  rewards: Array<{
    id: string;
    creditsAwarded: number;
    plan: string;
    createdAt: string;
    referredEmail: string;
    referredName: string | null;
  }>;
};

export function ReferralProgramPanel() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/referral");
      const data = await readJsonResponse<ReferralSummary & { error?: string }>(response);

      if (!response.ok) {
        throw new Error(responseErrorMessage(response, data, "Could not load referral program."));
      }

      setSummary(data);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not load referral program.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink() {
    if (!summary?.referralUrl) return;

    try {
      await navigator.clipboard.writeText(summary.referralUrl);
      setCopied(true);
      notify.success("Referral link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Could not copy link.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading referral program…
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e4e2de] bg-gradient-to-br from-[#5b3cf5]/8 via-white to-[#f7f6f3] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5b3cf5]/10">
            <Gift className="h-6 w-6 text-[#5b3cf5]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-[#111110]">Invite friends, earn credits</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6b6965]">
              Share your link. When someone signs up and buys a paid plan, you get{" "}
              <strong className="font-semibold text-[#111110]">{summary.creditsPerReferral} credits</strong>{" "}
              automatically — once per referral.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1 rounded-xl border border-[#e4e2de] bg-white px-3 py-2.5 text-sm text-[#3d3c39]">
            <span className="block truncate">{summary.referralUrl}</span>
          </div>
          <Button
            type="button"
            onClick={() => void copyLink()}
            className="h-10 shrink-0 rounded-xl bg-[#5b3cf5] px-4 text-white hover:bg-[#4f32e0]"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        </div>

        <p className="mt-3 text-xs text-[#a8a49f]">
          Your code: <span className="font-mono font-medium text-[#6b6965]">{summary.referralCode}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Signups from your link" value={summary.totalSignups} icon={Users} />
        <StatCard label="Paid conversions" value={summary.successfulReferrals} icon={Check} />
        <StatCard label="Credits earned" value={summary.totalCreditsEarned} icon={Gift} />
      </div>

      {summary.rewards.length > 0 ? (
        <div className="rounded-2xl border border-[#e4e2de] bg-white">
          <div className="border-b border-[#e4e2de] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#111110]">Recent rewards</h3>
          </div>
          <ul className="divide-y divide-[#e4e2de]">
            {summary.rewards.map((reward) => (
              <li key={reward.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#111110]">
                    {reward.referredName ?? reward.referredEmail}
                  </p>
                  <p className="text-xs text-[#a8a49f]">
                    Subscribed to {reward.plan} · {new Date(reward.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-[#5b3cf5]">+{reward.creditsAwarded} credits</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Gift;
}) {
  return (
    <div className="rounded-2xl border border-[#e4e2de] bg-white p-4">
      <div className="flex items-center gap-2 text-[#a8a49f]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium uppercase tracking-[0.08em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#111110]">{value}</p>
    </div>
  );
}
