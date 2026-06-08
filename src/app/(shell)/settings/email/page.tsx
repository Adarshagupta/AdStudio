import { EmailSettingsPanel } from "@/components/settings/EmailSettingsPanel";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmailConfigStatus } from "@/lib/email/provider";

export default async function EmailSettingsPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "manageEmail")) {
    return (
      <AccessDenied
          title="Email access unavailable"
          message="Ask a workspace admin to enable email management for your account."
        />
      );
  }

  const [events, members] = await Promise.all([
    prisma.emailEvent.findMany({
      where: { workspaceId: currentUser.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        toEmail: true,
        subject: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        memberships: {
          some: {
            workspaceId: currentUser.workspace.id,
            isActive: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  return (
    <div className="space-y-4">
        <h1 className="text-xl font-medium">Email</h1>
        <EmailSettingsPanel
          config={getEmailConfigStatus()}
          events={events.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          }))}
          members={members}
        />
      </div>
    );
}
