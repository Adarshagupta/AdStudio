import { ImageStudioHome } from "@/components/studio/ImageStudioHome";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";

export default async function ImageStudioPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Image Studio access unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  return <ImageStudioHome />;
}
