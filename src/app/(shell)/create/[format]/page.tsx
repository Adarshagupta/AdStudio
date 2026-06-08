import { notFound } from "next/navigation";

import { CreateWorkspace } from "@/components/create/CreateWorkspace";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFormatBySlug } from "@/lib/formats";

export default async function CreateFormatPage({
  params,
  searchParams,
}: {
  params: { format: string };
  searchParams: { prompt?: string; autostart?: string };
}) {
  const currentUser = await requireCurrentUser();
  const selectedFormat = getFormatBySlug(params.format);

  if (!selectedFormat) {
    notFound();
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
          title="Create access unavailable"
          message="Ask a workspace admin to enable video creation for your account."
        />
      );
  }

  const avatars = await prisma.avatar.findMany({
    where: {
      OR: [{ workspaceId: currentUser.workspace.id }, { isSystem: true }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return (
    <CreateWorkspace
        format={selectedFormat.format}
        title={selectedFormat.name}
        avatars={avatars}
        initialPrompt={searchParams.prompt ?? ""}
        autostart={searchParams.autostart === "1"}
      />
    );
}
