import { ReferralProgramPanel } from "@/components/settings/ReferralProgramPanel";
import { requireCurrentUser } from "@/lib/auth";

export default async function ReferralSettingsPage() {
  await requireCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium">Referral program</h1>
        <p className="text-sm text-muted-foreground">
          Share LiteMoov with creators and earn credits when they subscribe.
        </p>
      </div>

      <ReferralProgramPanel />
    </div>
  );
}
