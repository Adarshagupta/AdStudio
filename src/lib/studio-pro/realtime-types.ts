import type { StudioAgentChatSyncPayload } from "@/lib/studio-pro/agent-sessions";
import type { StudioViewport } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export type StudioPresencePayload = {
  clientId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

export type StudioSyncPayload = {
  updatedAt: string;
  clientId: string;
  userId: string;
  name: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

export type StudioRealtimeEvent =
  | { type: "sync"; payload: StudioSyncPayload }
  | { type: "agent_chat"; payload: StudioAgentChatSyncPayload }
  | { type: "presence"; payload: StudioPresencePayload }
  | { type: "presence_leave"; payload: { clientId: string } };
