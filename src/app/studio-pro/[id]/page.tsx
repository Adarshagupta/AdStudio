import { notFound } from "next/navigation";

import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { AccessDenied } from "@/components/shared/AccessDenied";
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
      <ProtectedShell currentUser={currentUser}>
        <AccessDenied
          title="Studio Pro access unavailable"
          message="Ask a workspace admin to enable content creation for your account."
        />
      </ProtectedShell>
    );
  }

  const flow = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!flow) {
    notFound();
  }

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport);
  const hasSavedWork = snapshot.nodes.length > 0 || snapshot.edges.length > 0;

  return (
    <ProtectedShell currentUser={currentUser} fullscreen>
      <StudioProWorkspace
        sessionId={flow.id}
        flowName={flow.name}
        initialNodes={snapshot.nodes}
        initialEdges={snapshot.edges}
        initialViewport={snapshot.viewport}
        showTemplatePickerOnLoad={!hasSavedWork && !snapshot.viewport.ui?.templatePickerDismissed}
      />
    </ProtectedShell>
  );
}
