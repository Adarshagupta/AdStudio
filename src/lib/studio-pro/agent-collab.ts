import type { StudioNode } from "@/lib/studio-pro/types";
import { getNodeHeight } from "@/lib/studio-pro/types";

type CollabPeer = {
  clientId: string;
  userId: string;
  name: string;
  x: number;
  y: number;
};

export type StudioAgentCollabContext = {
  activeTeammates: Array<{ userId: string; name: string; clientId: string }>;
  peerFocusNodes: Array<{ userId: string; name: string; nodeId: string }>;
};

export function findNodeAtCanvasPoint(nodes: StudioNode[], x: number, y: number) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    const height = getNodeHeight(node);
    if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + height) {
      return node;
    }
  }
  return null;
}

export function buildCollabContext(
  peers: CollabPeer[],
  nodes: StudioNode[],
  selfClientId: string,
): StudioAgentCollabContext {
  const activeTeammates = peers
    .filter((peer) => peer.clientId !== selfClientId)
    .map((peer) => ({
      userId: peer.userId,
      name: peer.name,
      clientId: peer.clientId,
    }));

  const peerFocusNodes = peers
    .filter((peer) => peer.clientId !== selfClientId)
    .map((peer) => {
      const node = findNodeAtCanvasPoint(nodes, peer.x, peer.y);
      if (!node) return null;
      return { userId: peer.userId, name: peer.name, nodeId: node.id };
    })
    .filter((entry): entry is { userId: string; name: string; nodeId: string } => Boolean(entry));

  return { activeTeammates, peerFocusNodes };
}

export function formatCollabContextForPrompt(context: StudioAgentCollabContext | null | undefined) {
  if (!context) return "";
  if (context.activeTeammates.length === 0) return "";

  const lines = ["## Teammates on this canvas"];
  lines.push(
    ...context.activeTeammates.map((peer) => `- ${peer.name} is editing with you`),
  );

  if (context.peerFocusNodes.length > 0) {
    lines.push("They may be viewing:");
    lines.push(
      ...context.peerFocusNodes.map(
        (entry) => `- ${entry.name} is near node ${entry.nodeId}`,
      ),
    );
    lines.push(
      "Avoid destructive edits on nodes a teammate is viewing — use select_node or ask them first.",
    );
  }

  return lines.join("\n");
}

export function teammateBlocksNode(
  context: StudioAgentCollabContext | null | undefined,
  nodeId: string,
) {
  if (!context) return null;
  const blocker = context.peerFocusNodes.find((entry) => entry.nodeId === nodeId);
  if (!blocker) return null;
  return blocker.name;
}
