import { Suspense } from "react";

import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { SocialIntegrationsPanel } from "@/components/settings/SocialIntegrationsPanel";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Card } from "@/components/ui/card";
import { listIntegrationStatuses } from "@/lib/integrations/connections";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";

export default async function IntegrationsSettingsPage() {
  const currentUser = await requireCurrentUser();

  if (!currentUserCan(currentUser, "manageIntegrations")) {
    return (
      <ProtectedShell currentUser={currentUser}>
        <AccessDenied
          title="Integration access unavailable"
          message="Ask a workspace admin to enable connected account management for your account."
        />
      </ProtectedShell>
    );
  }

  const providers = await listIntegrationStatuses(currentUser.workspace.id);

  return (
    <ProtectedShell currentUser={currentUser}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Connected accounts</h1>
          <p className="text-sm text-muted-foreground">
            Link Instagram, TikTok, Facebook, and Reddit to publish content from your workspace.
          </p>
        </div>

        <Suspense
          fallback={
            <Card className="bg-white px-5 py-8 text-sm text-muted-foreground">Loading integrations...</Card>
          }
        >
          <SocialIntegrationsPanel initialProviders={providers} />
        </Suspense>
      </div>
    </ProtectedShell>
  );
}
