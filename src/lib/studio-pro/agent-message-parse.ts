import type { StudioNode } from "@/lib/studio-pro/types";

const NODE_REF_PATTERN = /@([a-z]+-[a-z0-9-]+)/gi;

export function resolveNodeReference(token: string, nodes: StudioNode[]) {
  const normalized = token.toLowerCase();
  const exact = nodes.find((node) => node.id.toLowerCase() === normalized);
  if (exact) return exact;

  const partial = nodes.filter((node) => node.id.toLowerCase().startsWith(normalized));
  if (partial.length === 1) return partial[0];
  return null;
}

export function expandNodeReferences(text: string, nodes: StudioNode[]) {
  const focusNodeIds: string[] = [];

  const expanded = text.replace(NODE_REF_PATTERN, (match, token: string) => {
    const node = resolveNodeReference(token, nodes);
    if (!node) return match;
    if (!focusNodeIds.includes(node.id)) focusNodeIds.push(node.id);
    return `@${node.id} (${node.type})`;
  });

  return { text: expanded, focusNodeIds };
}

const UNDO_PATTERN = /^\s*(undo|undo that|revert( last change)?)\s*[!.?]*\s*$/i;

export function isUndoCommand(text: string) {
  return UNDO_PATTERN.test(text.trim());
}
