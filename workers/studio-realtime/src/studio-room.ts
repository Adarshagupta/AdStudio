import { DurableObject } from "cloudflare:workers";

import type {
  ClientAttachment,
  ClientMessage,
  ServerMessage,
  StudioPresencePayload,
} from "./types";

const PRESENCE_TTL_MS = 45_000;

export class StudioRoom extends DurableObject {
  private presence = new Map<string, StudioPresencePayload>();

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");
    const userId = request.headers.get("X-Studio-User-Id");
    const name = request.headers.get("X-Studio-User-Name");
    const color = request.headers.get("X-Studio-User-Color");

    if (!clientId || !userId || !name || !color) {
      return new Response("Missing session metadata", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const attachment: ClientAttachment = { clientId, userId, name, color };
    server.serializeAttachment(attachment);

    const initialPresence = this.upsertPresence(attachment, 0, 0);
    server.send(
      JSON.stringify({
        type: "hello",
        presence: this.listPresence(clientId),
      } satisfies ServerMessage),
    );

    this.broadcast(
      {
        type: "presence",
        payload: initialPresence,
      },
      clientId,
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const attachment = ws.deserializeAttachment() as ClientAttachment | null;
    if (!attachment) return;

    let parsed: ClientMessage;
    try {
      const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
      parsed = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (parsed.type === "presence") {
      const payload = this.upsertPresence(attachment, parsed.x, parsed.y);
      this.broadcast({ type: "presence", payload }, attachment.clientId);
      return;
    }

    if (parsed.type === "sync") {
      const updatedAt = parsed.updatedAt ?? new Date().toISOString();
      this.broadcast(
        {
          type: "sync",
          payload: {
            updatedAt,
            clientId: attachment.clientId,
            userId: attachment.userId,
            name: attachment.name,
            nodes: parsed.nodes,
            edges: parsed.edges,
            viewport: parsed.viewport,
          },
        },
        attachment.clientId,
      );
      return;
    }

    if (parsed.type === "agent_chat") {
      const updatedAt = parsed.updatedAt ?? parsed.agentChat.updatedAt ?? new Date().toISOString();
      this.broadcast(
        {
          type: "agent_chat",
          payload: {
            ...parsed.agentChat,
            updatedAt,
            clientId: attachment.clientId,
            userId: attachment.userId,
            name: attachment.name,
          },
        },
        attachment.clientId,
      );
      return;
    }

    if (parsed.type === "leave") {
      this.removeClient(attachment.clientId);
    }
  }

  async webSocketClose(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as ClientAttachment | null;
    if (!attachment) return;
    this.removeClient(attachment.clientId);
  }

  private upsertPresence(
    attachment: ClientAttachment,
    x: number,
    y: number,
  ): StudioPresencePayload {
    const payload: StudioPresencePayload = {
      clientId: attachment.clientId,
      userId: attachment.userId,
      name: attachment.name,
      color: attachment.color,
      x,
      y,
      updatedAt: Date.now(),
    };
    this.presence.set(attachment.clientId, payload);
    this.pruneStalePresence();
    return payload;
  }

  private removeClient(clientId: string) {
    if (!this.presence.delete(clientId)) return;
    this.broadcast({
      type: "presence_leave",
      payload: { clientId },
    });
  }

  private pruneStalePresence() {
    const now = Date.now();
    for (const [clientId, entry] of this.presence.entries()) {
      if (now - entry.updatedAt > PRESENCE_TTL_MS) {
        this.presence.delete(clientId);
      }
    }
  }

  private listPresence(excludeClientId: string) {
    this.pruneStalePresence();
    return Array.from(this.presence.values()).filter(
      (entry) => entry.clientId !== excludeClientId,
    );
  }

  private broadcast(message: ServerMessage, exceptClientId?: string) {
    const encoded = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as ClientAttachment | null;
      if (!attachment || attachment.clientId === exceptClientId) continue;
      try {
        socket.send(encoded);
      } catch {
        // Best-effort fan-out.
      }
    }
  }
}
