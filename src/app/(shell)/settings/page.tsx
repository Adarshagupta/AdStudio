import Link from "next/link";
import {
  CreditCard,
  Gift,
  Link2,
  Mail,
  User,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { currentUserCan, requireCurrentUser } from "@/lib/auth";

const settingsLinks = [
  {
    href: "/settings/profile",
    label: "Profile",
    description: "Your name, email, and workspace role.",
    icon: User,
  },
  {
    href: "/settings/email-preferences",
    label: "Email preferences",
    description: "Choose which emails you receive.",
    icon: Mail,
  },
  {
    href: "/settings/referral",
    label: "Referrals",
    description: "Share your link and earn credits when friends subscribe.",
    icon: Gift,
  },
  {
    href: "/settings/billing",
    label: "Billing",
    description: "Plan, credits, and usage.",
    icon: CreditCard,
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    description: "Connected social accounts.",
    icon: Link2,
    permission: "manageIntegrations" as const,
  },
  {
    href: "/settings/members",
    label: "Members",
    description: "Invite and manage your team.",
    icon: Users,
    permission: "manageTeam" as const,
  },
];

export default async function SettingsPage() {
  const currentUser = await requireCurrentUser();

  const links = settingsLinks.filter((link) => {
    if (!link.permission) return true;
    return currentUserCan(currentUser, link.permission);
  });

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, notifications, billing, and workspace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="flex h-full gap-4 bg-white p-5 transition-colors hover:bg-zinc-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                    <Icon className="h-5 w-5 text-zinc-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{link.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
}
