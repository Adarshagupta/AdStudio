import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOAuthAppUrl } from "@/lib/integrations/app-url";
import { buildReferralSignupUrl, getReferralProgramSummary } from "@/lib/referral/program";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getReferralProgramSummary(currentUser.user.id);
  const referralUrl = buildReferralSignupUrl(getOAuthAppUrl(), summary.referralCode);

  return NextResponse.json({
    ...summary,
    referralUrl,
  });
}
