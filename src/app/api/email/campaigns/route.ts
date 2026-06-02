import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendCampaignToWorkspace } from "@/lib/email/service";

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  channel: z.enum(["MARKETING", "ADS", "REMINDER"]),
  subject: z.string().trim().min(3).max(160),
  textBody: z.string().trim().min(10).max(8000),
  htmlBody: z.string().trim().max(12000).optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageEmail")) {
    return NextResponse.json({ error: "You do not have access to manage email." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = campaignSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const scheduledAt = result.data.scheduledAt ? new Date(result.data.scheduledAt) : null;
  const shouldSchedule = scheduledAt && scheduledAt > new Date();
  const campaign = await prisma.emailCampaign.create({
    data: {
      workspaceId: currentUser.workspace.id,
      createdById: currentUser.user.id,
      name: result.data.name,
      channel: result.data.channel,
      subject: result.data.subject,
      textBody: result.data.textBody,
      htmlBody: result.data.htmlBody || null,
      scheduledAt,
      status: shouldSchedule ? "SCHEDULED" : "SENDING",
    },
  });

  if (shouldSchedule) {
    return NextResponse.json({ campaign }, { status: 201 });
  }

  try {
    const delivery = await sendCampaignToWorkspace(campaign.id);
    const updatedCampaign = await prisma.emailCampaign.findUnique({ where: { id: campaign.id } });

    return NextResponse.json({ campaign: updatedCampaign, delivery }, { status: 201 });
  } catch (error) {
    const failedCampaign = await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      {
        campaign: failedCampaign,
        error: error instanceof Error ? error.message : "Campaign delivery failed.",
      },
      { status: 502 },
    );
  }
}
