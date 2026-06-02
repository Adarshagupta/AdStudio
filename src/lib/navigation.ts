import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Clapperboard,
  FolderOpen,
  Home,
  Library,
  Link2,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import type { WorkspacePermissionKey } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: "exact" | "prefix" | "studio-pro";
  permission?: WorkspacePermissionKey;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const universalNavGroups: NavGroup[] = [
  {
    label: "Create",
    items: [
      { label: "Home", href: "/dashboard", icon: Home, match: "exact" },
      { label: "Studio Pro", href: "/studio-pro", icon: Workflow, match: "studio-pro", permission: "createContent" },
      { label: "UGC Talking Head", href: "/create/ugc-talking-head", icon: Clapperboard, match: "prefix", permission: "createContent" },
      { label: "Brain Rot Video", href: "/create/brain-rot", icon: Sparkles, match: "prefix", permission: "createContent" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Library", href: "/library", icon: Library, match: "exact", permission: "viewLibrary" },
      { label: "Projects", href: "/dashboard", icon: FolderOpen, match: "exact", permission: "viewLibrary" },
      { label: "Analytics", href: "/analytics", icon: BarChart3, match: "exact", permission: "viewAnalytics" },
      { label: "Members", href: "/settings/members", icon: Users, match: "prefix", permission: "manageTeam" },
      { label: "Integrations", href: "/settings/integrations", icon: Link2, match: "prefix", permission: "manageIntegrations" },
    ],
  },
];

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match === "studio-pro") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  if (item.match === "prefix") {
    return pathname.startsWith(item.href);
  }
  return pathname === item.href;
}

export function getStudioProNavState(pathname: string) {
  const isStudioPro = pathname.startsWith("/studio-pro");
  const isStudioSession = /^\/studio-pro\/[^/]+$/.test(pathname);

  return {
    isStudioPro,
    isStudioSession,
    modeLabel: isStudioSession ? "Studio Pro mode" : "Studio Pro",
  };
}
