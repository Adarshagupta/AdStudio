import type { ChatMessage } from "@/lib/dashboard-chat";

export type ChatSessionMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const INDEX_KEY = "dashboard-chat-sessions-v1";
const LEGACY_MESSAGES_KEY = "dashboard-chat-messages-v1";
const sessionMessagesKey = (id: string) => `dashboard-chat-session-${id}`;

function readIndex(): ChatSessionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSessionMeta[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function writeIndex(sessions: ChatSessionMeta[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(sessions));
}

export function createChatSessionId() {
  return crypto.randomUUID();
}

export function sessionTitleFromMessages(messages: ChatMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.text?.trim();
  if (!text) return "New chat";
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

export function loadChatSessionIndex() {
  return readIndex();
}

export function loadChatSessionMessages(sessionId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionMessagesKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatSessionMessages(sessionId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(sessionMessagesKey(sessionId), JSON.stringify(messages.slice(-80)));
  upsertChatSessionMeta(sessionId, sessionTitleFromMessages(messages));
}

export function upsertChatSessionMeta(sessionId: string, title?: string) {
  const now = Date.now();
  const sessions = readIndex();
  const existing = sessions.find((item) => item.id === sessionId);

  const next: ChatSessionMeta = {
    id: sessionId,
    title: title?.trim() || existing?.title || "New chat",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const without = sessions.filter((item) => item.id !== sessionId);
  writeIndex([next, ...without]);
}

export function createChatSessionRecord(sessionId?: string): ChatSessionMeta {
  const id = sessionId ?? createChatSessionId();
  const now = Date.now();
  const meta: ChatSessionMeta = {
    id,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
  };
  const sessions = readIndex().filter((item) => item.id !== id);
  writeIndex([meta, ...sessions]);
  localStorage.setItem(sessionMessagesKey(id), JSON.stringify([]));
  return meta;
}

export function deleteChatSession(sessionId: string) {
  if (typeof window === "undefined") return;
  writeIndex(readIndex().filter((item) => item.id !== sessionId));
  localStorage.removeItem(sessionMessagesKey(sessionId));
}

export function migrateLegacyChatStorage() {
  if (typeof window === "undefined") return null;
  try {
    const legacy = sessionStorage.getItem(LEGACY_MESSAGES_KEY);
    if (!legacy) return null;

    const messages = JSON.parse(legacy) as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
      sessionStorage.removeItem(LEGACY_MESSAGES_KEY);
      return null;
    }

    const id = createChatSessionId();
    localStorage.setItem(sessionMessagesKey(id), JSON.stringify(messages));
    upsertChatSessionMeta(id, sessionTitleFromMessages(messages));
    sessionStorage.removeItem(LEGACY_MESSAGES_KEY);
    return id;
  } catch {
    return null;
  }
}

export function chatSessionPath(sessionId: string, query?: URLSearchParams) {
  const base = `/dashboard/chat/${sessionId}`;
  if (!query || query.toString().length === 0) return base;
  return `${base}?${query.toString()}`;
}
