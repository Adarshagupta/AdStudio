import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Clapperboard,
  Home,
  Images,
  Library,
  Sparkles,
  Store,
  Workflow,
} from "lucide-react";
import type { WorkspacePermissionKey } from "@/lib/permissions";

export type NavSideAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: "exact" | "prefix" | "studio-pro";
  permission?: WorkspacePermissionKey;
  /** Hidden on viewports below Tailwind `lg` (1024px). */
  largeScreenOnly?: boolean;
  /** Optional icon link shown on the right of this nav row (e.g. Studio Pro → Marketplace). */
  sideAction?: NavSideAction;
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
      {
        label: "Studio Pro",
        href: "/studio-pro",
        icon: Workflow,
        match: "studio-pro",
        permission: "createContent",
        largeScreenOnly: true,
        sideAction: {
          label: "Marketplace",
          href: "/studio-pro/marketplace",
          icon: Store,
        },
      },
      { label: "UGC Talking Head", href: "/create/ugc-talking-head", icon: Clapperboard, match: "prefix", permission: "createContent" },
      { label: "Brain Rot Video", href: "/create/brain-rot", icon: Sparkles, match: "prefix", permission: "createContent" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Library", href: "/library", icon: Library, match: "exact", permission: "viewLibrary" },
      { label: "Assets", href: "/assets", icon: Images, match: "exact", permission: "createContent" },
      { label: "Analytics", href: "/analytics", icon: BarChart3, match: "exact", permission: "viewAnalytics" },
    ],
  },
];

export function isNavSideActionActive(pathname: string, action: NavSideAction) {
  return pathname === action.href || pathname.startsWith(`${action.href}/`);
}

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
  };
}
