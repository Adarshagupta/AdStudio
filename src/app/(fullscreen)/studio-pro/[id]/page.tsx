import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/shared/AccessDenied";
import { StudioProPageGate } from "@/components/studio-pro/StudioProPageGate";
import { StudioProWorkspace } from "@/components/studio-pro/StudioProWorkspace";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";
import { getStudioFlowForUser, parseFlowSnapshot } from "@/lib/studio-pro/flows";

type StudioProSessionPageProps = {
  params: { id: string };
};

export default async function StudioProSessionPage({ params }: StudioProSessionPageProps) {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "createContent")) {
    return (
      <AccessDenied
          title="Studio Pro access unavailable"
          message="Ask a workspace admin to enable content creation for your account."
        />
      );
  }

  const flow = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!flow) {
    notFound();
  }

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport, flow.agentChat);
  const hasSavedWork = snapshot.nodes.length > 0 || snapshot.edges.length > 0;

  const collaboratorName =
    currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";

  return (
    <StudioProPageGate>
    <StudioProWorkspace
        sessionId={flow.id}
        flowName={flow.name}
        workspaceId={currentUser.workspace.id}
        creditsRemaining={currentUser.workspace.creditsRemaining}
        initialNodes={snapshot.nodes}
        initialEdges={snapshot.edges}
        initialViewport={snapshot.viewport}
        initialAgentChat={snapshot.agentChat}
        initialUpdatedAt={flow.updatedAt.toISOString()}
        showTemplatePickerOnLoad={!hasSavedWork && !snapshot.viewport.ui?.templatePickerDismissed}
        collaborator={{
          userId: currentUser.user.id,
          name: collaboratorName,
        }}
      />
    </StudioProPageGate>
    );
}
