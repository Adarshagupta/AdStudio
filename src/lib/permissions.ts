export const workspacePermissionKeys = [
  "createContent",
  "viewLibrary",
  "manageBrandAssets",
  "viewAnalytics",
  "manageIntegrations",
  "manageTeam",
  "manageEmail",
] as const;

export type WorkspacePermissionKey = (typeof workspacePermissionKeys)[number];
export type WorkspaceRole = "ADMIN" | "MEMBER";
export type WorkspacePermissions = Record<WorkspacePermissionKey, boolean>;

export const permissionLabels: Record<
  WorkspacePermissionKey,
  { label: string; description: string }
> = {
  createContent: {
    label: "Create videos",
    description: "Generate scripts, videos, and Studio Pro flows.",
  },
  viewLibrary: {
    label: "Library access",
    description: "View generated videos and reusable workspace assets.",
  },
  manageBrandAssets: {
    label: "Brand assets",
    description: "Add avatars, logos, product images, and brand files.",
  },
  viewAnalytics: {
    label: "Analytics",
    description: "View generation usage, render speed, and team metrics.",
  },
  manageIntegrations: {
    label: "Integrations",
    description: "Connect or disconnect publishing accounts.",
  },
  manageTeam: {
    label: "Team access",
    description: "Invite people, change permissions, and remove members.",
  },
  manageEmail: {
    label: "Email",
    description: "Manage email delivery, campaigns, ads, and reminders.",
  },
};

export const allWorkspacePermissions: WorkspacePermissions = {
  createContent: true,
  viewLibrary: true,
  manageBrandAssets: true,
  viewAnalytics: true,
  manageIntegrations: true,
  manageTeam: true,
  manageEmail: true,
};

export const memberDefaultPermissions: WorkspacePermissions = {
  createContent: true,
  viewLibrary: true,
  manageBrandAssets: false,
  viewAnalytics: false,
  manageIntegrations: false,
  manageTeam: false,
  manageEmail: false,
};

export const accessPresets = [
  {
    id: "admin",
    label: "Admin",
    description: "Full workspace control",
    role: "ADMIN" as const,
    permissions: allWorkspacePermissions,
  },
  {
    id: "creator",
    label: "Creator",
    description: "Generate and manage production assets",
    role: "MEMBER" as const,
    permissions: {
      createContent: true,
      viewLibrary: true,
      manageBrandAssets: true,
      viewAnalytics: false,
      manageIntegrations: false,
      manageTeam: false,
      manageEmail: false,
    },
  },
  {
    id: "analyst",
    label: "Analyst",
    description: "Review library and analytics",
    role: "MEMBER" as const,
    permissions: {
      createContent: false,
      viewLibrary: true,
      manageBrandAssets: false,
      viewAnalytics: true,
      manageIntegrations: false,
      manageTeam: false,
      manageEmail: false,
    },
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only library access",
    role: "MEMBER" as const,
    permissions: {
      createContent: false,
      viewLibrary: true,
      manageBrandAssets: false,
      viewAnalytics: false,
      manageIntegrations: false,
      manageTeam: false,
      manageEmail: false,
    },
  },
] as const;

export type AccessPresetId = (typeof accessPresets)[number]["id"] | "custom";

export function getDefaultPermissions(role: WorkspaceRole): WorkspacePermissions {
  return role === "ADMIN" ? { ...allWorkspacePermissions } : { ...memberDefaultPermissions };
}

export function normalizePermissions(
  value: unknown,
  role: WorkspaceRole = "MEMBER",
): WorkspacePermissions {
  if (role === "ADMIN") {
    return { ...allWorkspacePermissions };
  }

  const base = getDefaultPermissions(role);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return base;
  }

  const source = value as Partial<Record<WorkspacePermissionKey, unknown>>;

  return workspacePermissionKeys.reduce<WorkspacePermissions>((permissions, key) => {
    permissions[key] = typeof source[key] === "boolean" ? Boolean(source[key]) : base[key];
    return permissions;
  }, { ...base });
}

export function hasWorkspacePermission(
  user: { role: WorkspaceRole; permissions?: unknown },
  permission: WorkspacePermissionKey,
) {
  return normalizePermissions(user.permissions, user.role)[permission];
}

export function getAccessPresetId(role: WorkspaceRole, permissions: unknown): AccessPresetId {
  const normalized = normalizePermissions(permissions, role);
  const match = accessPresets.find((preset) => {
    if (preset.role !== role) return false;
    return workspacePermissionKeys.every((key) => preset.permissions[key] === normalized[key]);
  });

  return match?.id ?? "custom";
}

export function getAccessLabel(role: WorkspaceRole, permissions: unknown) {
  const presetId = getAccessPresetId(role, permissions);

  if (presetId === "custom") {
    return "Custom";
  }

  return accessPresets.find((preset) => preset.id === presetId)?.label ?? "Custom";
}

export function getPresetById(presetId: AccessPresetId) {
  return accessPresets.find((preset) => preset.id === presetId);
}
