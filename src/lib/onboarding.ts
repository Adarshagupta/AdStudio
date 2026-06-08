import type { CompanySize, MonthlyAdSpend } from "@prisma/client";

import { prisma } from "@/lib/db";
import { isDatabaseSetupError } from "@/lib/prisma-errors";

export const companySizeOptions = [
  { value: "SIZE_1_5" as const, label: "1-5" },
  { value: "SIZE_6_50" as const, label: "6-50" },
  { value: "SIZE_51_100" as const, label: "51-100" },
  { value: "SIZE_100_PLUS" as const, label: "100+" },
];

export const monthlyAdSpendOptions = [
  { value: "UNDER_20K" as const, label: "< 20K" },
  { value: "SPEND_20K_100K" as const, label: "20K - 100K" },
  { value: "SPEND_100K_1M" as const, label: "100K - 1M" },
  { value: "SPEND_1M_PLUS" as const, label: "1M+" },
];

export const hearAboutOptions = [
  { value: "friend_colleagues", label: "Friend or Colleagues" },
  { value: "ai_search", label: "AI search / ChatGPT" },
  { value: "x_twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google_search", label: "Google search" },
  { value: "instagram_creator", label: "Instagram creator" },
  { value: "youtube_creator", label: "YouTube creator" },
  { value: "youtube_ad", label: "YouTube ad" },
  { value: "google_ad", label: "Google ad" },
  { value: "meta_ad", label: "Instagram / Facebook ad" },
  { value: "other", label: "Other" },
] as const;

export type HearAboutSource = (typeof hearAboutOptions)[number]["value"];

export type OnboardingPayload = {
  companyName?: string;
  companySize?: CompanySize;
  monthlyAdSpend?: MonthlyAdSpend;
  hearAboutSource?: HearAboutSource;
  hearAboutOther?: string;
};

export async function getWorkspaceOnboarding(workspaceId: string) {
  return prisma.workspaceOnboarding.findUnique({
    where: { workspaceId },
  });
}

export async function isWorkspaceOnboardingComplete(workspaceId: string) {
  try {
    const record = await getWorkspaceOnboarding(workspaceId);
    return Boolean(record?.completedAt);
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      console.warn("[onboarding] Skipping onboarding gate until migrations are applied.");
      return true;
    }
    throw error;
  }
}

export async function ensureWorkspaceOnboarding(workspaceId: string) {
  return prisma.workspaceOnboarding.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });
}

export async function saveWorkspaceOnboarding(workspaceId: string, data: OnboardingPayload) {
  await ensureWorkspaceOnboarding(workspaceId);

  const hearAboutOther =
    data.hearAboutSource === "other" ? data.hearAboutOther?.trim() || null : null;

  return prisma.workspaceOnboarding.update({
    where: { workspaceId },
    data: {
      companyName: data.companyName?.trim() || undefined,
      companySize: data.companySize,
      monthlyAdSpend: data.monthlyAdSpend,
      hearAboutSource: data.hearAboutSource,
      hearAboutOther,
    },
  });
}

export async function completeWorkspaceOnboarding(workspaceId: string, data: OnboardingPayload) {
  const hearAboutOther =
    data.hearAboutSource === "other" ? data.hearAboutOther?.trim() || null : null;

  await prisma.$transaction(async (tx) => {
    if (data.companyName?.trim()) {
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { name: data.companyName.trim() },
      });
    }

    await tx.workspaceOnboarding.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        companyName: data.companyName?.trim() || null,
        companySize: data.companySize ?? null,
        monthlyAdSpend: data.monthlyAdSpend ?? null,
        hearAboutSource: data.hearAboutSource ?? null,
        hearAboutOther,
        completedAt: new Date(),
      },
      update: {
        companyName: data.companyName?.trim() || null,
        companySize: data.companySize ?? null,
        monthlyAdSpend: data.monthlyAdSpend ?? null,
        hearAboutSource: data.hearAboutSource ?? null,
        hearAboutOther,
        completedAt: new Date(),
      },
    });
  });
}

function parseHearAboutSource(value: string | null | undefined): HearAboutSource | null {
  if (!value) return null;
  return hearAboutOptions.some((option) => option.value === value)
    ? (value as HearAboutSource)
    : null;
}

export function serializeOnboarding(
  record: Awaited<ReturnType<typeof getWorkspaceOnboarding>>,
  workspaceName: string,
) {
  return {
    completed: Boolean(record?.completedAt),
    workspaceName,
    companyName: record?.companyName ?? workspaceName,
    companySize: record?.companySize ?? null,
    monthlyAdSpend: record?.monthlyAdSpend ?? null,
    hearAboutSource: parseHearAboutSource(record?.hearAboutSource),
    hearAboutOther: record?.hearAboutOther ?? null,
  };
}
