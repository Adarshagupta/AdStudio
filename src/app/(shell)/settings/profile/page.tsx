import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { MobileLoginQrCard } from "@/components/settings/MobileLoginQrCard";
import { requireCurrentUser } from "@/lib/auth";

export default async function ProfileSettingsPage() {
  const currentUser = await requireCurrentUser();

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Profile</h1>
          <p className="text-sm text-muted-foreground">Update how you appear across the workspace.</p>
        </div>

        <ProfileSettingsForm
          initialName={currentUser.user.name}
          email={currentUser.user.email}
          role={currentUser.user.role}
        />

        <MobileLoginQrCard />
      </div>
    );
}
