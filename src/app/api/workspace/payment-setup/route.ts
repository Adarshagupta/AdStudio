import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import {
  completePaymentSetup,
  skipPaymentSetup,
} from "@/lib/billing/welcome-credits";
import { parseRequestJson } from "@/lib/http/json";

const paymentSetupSchema = z.object({
  action: z.enum(["skip", "complete"]),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can update payment setup." },
      { status: 403 },
    );
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = paymentSetupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment setup action." }, { status: 400 });
  }

  try {
    const record =
      parsed.data.action === "skip"
        ? await skipPaymentSetup(currentUser.workspace.id, currentUser.user.id)
        : await completePaymentSetup(currentUser.workspace.id, currentUser.user.id);

    return NextResponse.json({
      ok: true,
      paymentSetupSkipped: Boolean(record.paymentSetupSkippedAt),
      paymentSetupCompleted: Boolean(record.paymentSetupCompletedAt),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save payment setup." },
      { status: 400 },
    );
  }
}
