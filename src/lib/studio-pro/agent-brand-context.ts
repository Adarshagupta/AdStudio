export type StudioAgentBrandContext = {
  workspaceName?: string;
  companyName?: string;
  brandTone?: string;
  targetAudience?: string;
  defaultAspectRatio?: string;
};

const storageKey = (workspaceId: string) => `studio-agent-brand-${workspaceId}`;

export function loadLocalBrandOverrides(workspaceId: string): Partial<StudioAgentBrandContext> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StudioAgentBrandContext>;
    return {
      brandTone: typeof parsed.brandTone === "string" ? parsed.brandTone : undefined,
      targetAudience: typeof parsed.targetAudience === "string" ? parsed.targetAudience : undefined,
      defaultAspectRatio:
        typeof parsed.defaultAspectRatio === "string" ? parsed.defaultAspectRatio : undefined,
    };
  } catch {
    return {};
  }
}

export function saveLocalBrandOverrides(
  workspaceId: string,
  overrides: Partial<StudioAgentBrandContext>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    brandTone: overrides.brandTone?.trim() || undefined,
    targetAudience: overrides.targetAudience?.trim() || undefined,
    defaultAspectRatio: overrides.defaultAspectRatio?.trim() || undefined,
  };

  window.localStorage.setItem(storageKey(workspaceId), JSON.stringify(payload));
}

export function mergeBrandContext(
  remote: Partial<StudioAgentBrandContext>,
  local: Partial<StudioAgentBrandContext>,
): StudioAgentBrandContext | null {
  const merged: StudioAgentBrandContext = {
    workspaceName: remote.workspaceName ?? local.workspaceName,
    companyName: remote.companyName ?? local.companyName,
    brandTone: remote.brandTone ?? local.brandTone,
    targetAudience: remote.targetAudience ?? local.targetAudience,
    defaultAspectRatio: remote.defaultAspectRatio ?? local.defaultAspectRatio,
  };

  const hasValue = Object.values(merged).some((value) => Boolean(value?.trim()));
  return hasValue ? merged : null;
}

export function formatBrandContextForPrompt(context: StudioAgentBrandContext | null) {
  if (!context) return "";

  const lines: string[] = [];
  if (context.workspaceName?.trim()) lines.push(`Workspace: ${context.workspaceName.trim()}`);
  if (context.companyName?.trim()) lines.push(`Brand / company: ${context.companyName.trim()}`);
  if (context.brandTone?.trim()) lines.push(`Tone: ${context.brandTone.trim()}`);
  if (context.targetAudience?.trim()) lines.push(`Audience: ${context.targetAudience.trim()}`);
  if (context.defaultAspectRatio?.trim()) {
    lines.push(`Preferred aspect ratio: ${context.defaultAspectRatio.trim()}`);
  }

  if (lines.length === 0) return "";
  return `## Brand context\n${lines.map((line) => `- ${line}`).join("\n")}`;
}
