import { EmailPreferencesForm } from "@/components/settings/EmailPreferencesForm";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EmailPreferencesPage() {
  const currentUser = await requireCurrentUser();
  const preference = await prisma.emailPreference.upsert({
    where: { userId: currentUser.user.id },
    create: { userId: currentUser.user.id },
    update: {},
  });

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Email preferences</h1>
          <p className="text-sm text-muted-foreground">
            Choose which workspace and product emails you want to receive.
          </p>
        </div>

        <EmailPreferencesForm
          initialPreference={{
            marketingEnabled: preference.marketingEnabled,
            adsEnabled: preference.adsEnabled,
            remindersEnabled: preference.remindersEnabled,
            productUpdatesEnabled: preference.productUpdatesEnabled,
          }}
        />
      </div>
    );
}
