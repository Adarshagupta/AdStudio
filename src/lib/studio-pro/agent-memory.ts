export type StudioAgentFlowMemory = {
  summary?: string;
  preferences: Record<string, string>;
};

export const emptyFlowMemory = (): StudioAgentFlowMemory => ({
  preferences: {},
});

export function sanitizeFlowMemory(input: Partial<StudioAgentFlowMemory> | null | undefined) {
  if (!input) return emptyFlowMemory();

  const preferences: Record<string, string> = {};
  if (input.preferences && typeof input.preferences === "object") {
    for (const [key, value] of Object.entries(input.preferences)) {
      if (typeof value === "string" && value.trim()) {
        preferences[key.slice(0, 48)] = value.trim().slice(0, 240);
      }
    }
  }

  return {
    summary: typeof input.summary === "string" ? input.summary.trim().slice(0, 500) : undefined,
    preferences,
  };
}

export function formatFlowMemoryForPrompt(memory: StudioAgentFlowMemory | null | undefined) {
  const sanitized = sanitizeFlowMemory(memory ?? undefined);
  const prefLines = Object.entries(sanitized.preferences).map(([key, value]) => `- ${key}: ${value}`);

  if (!sanitized.summary && prefLines.length === 0) return "";

  const lines = ["## Flow memory (this session)"];
  if (sanitized.summary) lines.push(`Summary: ${sanitized.summary}`);
  if (prefLines.length) {
    lines.push("Preferences:");
    lines.push(...prefLines);
  }

  return lines.join("\n");
}

export function applyRememberFlow(
  memory: StudioAgentFlowMemory,
  args: { key?: string; value?: string; note?: string },
) {
  const next = sanitizeFlowMemory(memory);

  if (typeof args.note === "string" && args.note.trim()) {
    next.summary = args.note.trim().slice(0, 500);
  }

  if (typeof args.key === "string" && typeof args.value === "string" && args.key.trim()) {
    next.preferences[args.key.trim().slice(0, 48)] = args.value.trim().slice(0, 240);
  }

  return sanitizeFlowMemory(next);
}
