import { AccessDenied } from "@/components/shared/AccessDenied";
import { ImageStudioWorkspace } from "@/components/studio/ImageStudioWorkspace";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";

export default async function ImageStudioEditPage({
  searchParams,
}: {
  searchParams: { image?: string; w?: string; h?: string };
}) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Image Studio access unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  const width = searchParams.w ? Number.parseInt(searchParams.w, 10) : undefined;
  const height = searchParams.h ? Number.parseInt(searchParams.h, 10) : undefined;

  return (
    <ImageStudioWorkspace
      userId={currentUser.user.id}
      workspaceId={currentUser.workspace.id}
      creditsRemaining={currentUser.workspace.creditsRemaining}
      initialWidth={Number.isFinite(width) ? width : undefined}
      initialHeight={Number.isFinite(height) ? height : undefined}
    />
  );
}
