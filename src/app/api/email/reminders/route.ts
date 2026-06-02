import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendReminder } from "@/lib/email/service";

const reminderSchema = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
  sendAt: z.string().datetime(),
  userId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "manageEmail")) {
    return NextResponse.json({ error: "You do not have access to manage email reminders." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = reminderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (result.data.userId) {
    const member = await prisma.user.findFirst({
      where: {
        id: result.data.userId,
        workspaceId: currentUser.workspace.id,
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Reminder recipient not found." }, { status: 404 });
    }
  }

  const sendAt = new Date(result.data.sendAt);
  const shouldSendNow = sendAt <= new Date();
  const reminder = await prisma.emailReminder.create({
    data: {
      workspaceId: currentUser.workspace.id,
      createdById: currentUser.user.id,
      userId: result.data.userId || null,
      title: result.data.title,
      message: result.data.message,
      sendAt,
      status: shouldSendNow ? "SENDING" : "SCHEDULED",
    },
  });

  if (!shouldSendNow) {
    return NextResponse.json({ reminder }, { status: 201 });
  }

  try {
    const delivery = await sendReminder(reminder.id);
    const updatedReminder = await prisma.emailReminder.findUnique({ where: { id: reminder.id } });

    return NextResponse.json({ reminder: updatedReminder, delivery }, { status: 201 });
  } catch (error) {
    const failedReminder = await prisma.emailReminder.update({
      where: { id: reminder.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      {
        reminder: failedReminder,
        error: error instanceof Error ? error.message : "Reminder delivery failed.",
      },
      { status: 502 },
    );
  }
}
