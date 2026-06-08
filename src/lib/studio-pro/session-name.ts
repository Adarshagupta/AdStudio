const PLACEHOLDER_NAMES = new Set(["", "untitled flow", "unnamed", "unnamed session"]);

export function displayStudioFlowName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) {
    return "Untitled flow";
  }
  return trimmed;
}

export function isPlaceholderStudioFlowName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase());
}
