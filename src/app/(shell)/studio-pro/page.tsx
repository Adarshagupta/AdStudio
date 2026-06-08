import { StudioProPageGate } from "@/components/studio-pro/StudioProPageGate";
import { StudioProTabs } from "@/components/studio-pro/StudioProTabs";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { listStudioFlows } from "@/lib/studio-pro/flows";
import { listPublishedTemplateListings } from "@/lib/studio-pro/template-marketplace";

export default async function StudioProIndexPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
        title="Studio Pro access unavailable"
        message="Ask a workspace admin to enable content creation for your account."
      />
    );
  }

  const flows = await listStudioFlows(currentUser.workspace.id);
  const { listings } = await listPublishedTemplateListings({ pageSize: 48 });

  return (
    <StudioProPageGate>
      <StudioProTabs
        flows={flows.map((flow) => ({
          id: flow.id,
          name: flow.name,
          updatedAt: flow.updatedAt.toISOString(),
        }))}
        listings={listings}
      />
    </StudioProPageGate>
  );
}
