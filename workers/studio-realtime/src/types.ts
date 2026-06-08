export type StudioPresencePayload = {
  clientId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

export type StudioAgentChatSnapshot = {
  messages: unknown[];
  requestHistory: unknown[];
  updatedAt: string;
};

export type StudioAgentChatSyncPayload = StudioAgentChatSnapshot & {
  clientId: string;
  userId: string;
  name: string;
};

export type StudioSyncPayload = {
  updatedAt: string;
  clientId: string;
  userId: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
    ui?: { templatePickerDismissed?: boolean };
  };
};

export type ClientAttachment = {
  clientId: string;
  userId: string;
  name: string;
  color: string;
};

export type ClientMessage =
  | { type: "presence"; x: number; y: number }
  | {
      type: "sync";
      nodes: unknown[];
      edges: unknown[];
      viewport: StudioSyncPayload["viewport"];
      updatedAt?: string;
    }
  | {
      type: "agent_chat";
      agentChat: StudioAgentChatSnapshot;
      updatedAt?: string;
    }
  | { type: "leave" };

export type ServerMessage =
  | { type: "hello"; presence: StudioPresencePayload[] }
  | { type: "sync"; payload: StudioSyncPayload }
  | { type: "agent_chat"; payload: StudioAgentChatSyncPayload }
  | { type: "presence"; payload: StudioPresencePayload }
  | { type: "presence_leave"; payload: { clientId: string } };

export type StudioRealtimeClaims = {
  flowId: string;
  userId: string;
  name: string;
  color: string;
  workspaceId: string;
  clientId: string;
  iat: number;
  exp: number;
};
