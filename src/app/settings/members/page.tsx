import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { TeamSettingsPanel } from "@/components/settings/TeamSettingsPanel";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePermissions } from "@/lib/permissions";

export default async function MembersSettingsPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "manageTeam")) {
    return (
      <ProtectedShell currentUser={currentUser}>
        <AccessDenied
          title="Member access unavailable"
          message="Ask a workspace admin to enable team management for your account."
        />
      </ProtectedShell>
    );
  }

  await prisma.workspaceInvite.updateMany({
    where: {
      workspaceId: currentUser.workspace.id,
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const [members, invites] = await Promise.all([
    prisma.user.findMany({
      where: {
        workspaceId: currentUser.workspace.id,
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: currentUser.workspace.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <ProtectedShell currentUser={currentUser}>
      <div className="space-y-4">
        <h1 className="text-xl font-medium">Members</h1>
        <TeamSettingsPanel
          currentUserId={currentUser.user.id}
          initialMembers={members.map((member) => ({
            ...member,
            permissions: normalizePermissions(member.permissions, member.role),
            createdAt: member.createdAt.toISOString(),
          }))}
          initialInvites={invites.map((invite) => ({
            ...invite,
            permissions: normalizePermissions(invite.permissions, invite.role),
            expiresAt: invite.expiresAt.toISOString(),
            createdAt: invite.createdAt.toISOString(),
          }))}
        />
      </div>
    </ProtectedShell>
  );
}
