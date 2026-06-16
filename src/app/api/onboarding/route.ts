import type { CompanySize, MonthlyAdSpend } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { invalidateOnboardingCache } from "@/lib/onboarding-gate";
import {
  companySizeOptions,
  completeWorkspaceOnboarding,
  getWorkspaceOnboarding,
  hearAboutOptions,
  type HearAboutSource,
  monthlyAdSpendOptions,
  type OnboardingPayload,
  saveWorkspaceOnboarding,
  serializeOnboarding,
} from "@/lib/onboarding";

const companySizeValues = companySizeOptions.map((option) => option.value);
const monthlyAdSpendValues = monthlyAdSpendOptions.map((option) => option.value);
const hearAboutValues = hearAboutOptions.map((option) => option.value);

const onboardingFieldsSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  companySize: z.enum(companySizeValues as [string, ...string[]]).optional(),
  monthlyAdSpend: z.enum(monthlyAdSpendValues as [string, ...string[]]).optional(),
  hearAboutSource: z.enum(hearAboutValues as [string, ...string[]]).optional(),
  hearAboutOther: z.string().trim().max(200).optional(),
  complete: z.boolean().optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await getWorkspaceOnboarding(currentUser.workspace.id);

  return NextResponse.json(
    serializeOnboarding(record, currentUser.workspace.name),
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = onboardingFieldsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding data." }, { status: 400 });
  }

  const { complete: wantsComplete, ...rawFields } = parsed.data;
  const fields: OnboardingPayload = {
    companyName: rawFields.companyName,
    companySize: rawFields.companySize as CompanySize | undefined,
    monthlyAdSpend: rawFields.monthlyAdSpend as MonthlyAdSpend | undefined,
    hearAboutSource: rawFields.hearAboutSource as HearAboutSource | undefined,
    hearAboutOther: rawFields.hearAboutOther,
  };

  if (wantsComplete) {
    if (!fields.companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }
    if (!fields.companySize) {
      return NextResponse.json({ error: "Company size is required." }, { status: 400 });
    }
    if (!fields.monthlyAdSpend) {
      return NextResponse.json({ error: "Monthly ad spend is required." }, { status: 400 });
    }
    if (!fields.hearAboutSource) {
      return NextResponse.json({ error: "Please tell us how you heard about LiteMoov." }, { status: 400 });
    }
    if (fields.hearAboutSource === "other" && !fields.hearAboutOther?.trim()) {
      return NextResponse.json(
        { error: "Please tell us where you heard about LiteMoov." },
        { status: 400 },
      );
    }

    await completeWorkspaceOnboarding(currentUser.workspace.id, fields);
    invalidateOnboardingCache(currentUser.workspace.id);
  } else {
    await saveWorkspaceOnboarding(currentUser.workspace.id, fields);
  }

  const record = await getWorkspaceOnboarding(currentUser.workspace.id);

  return NextResponse.json(
    serializeOnboarding(record, currentUser.workspace.name),
  );
}
