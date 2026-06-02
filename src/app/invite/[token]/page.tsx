import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { AcceptInviteForm } from "@/components/settings/AcceptInviteForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAccessLabel } from "@/lib/permissions";
import { hashInviteToken, isInviteUsable } from "@/lib/team";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash: hashInviteToken(params.token) },
    include: { workspace: true },
  });

  if (!invite) {
    return <InviteUnavailable message="This invite link was not found." />;
  }

  if (!isInviteUsable(invite)) {
    if (invite.status === "PENDING" && invite.expiresAt <= new Date()) {
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }

    return <InviteUnavailable message="This invite link is no longer active." />;
  }

  return (
    <div>
      <div className="fixed left-1/2 top-6 z-10 -translate-x-1/2 rounded-full border bg-white px-4 py-2 text-xs text-muted-foreground">
        {getAccessLabel(invite.role, invite.permissions)} access
      </div>
      <AcceptInviteForm
        email={invite.email}
        token={params.token}
        workspaceName={invite.workspace.name}
      />
    </div>
  );
}

function InviteUnavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md space-y-5 bg-white p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-medium">Invite unavailable</h1>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </Card>
    </div>
  );
}
