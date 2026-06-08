import { resolveFireworksTextModel } from "@/lib/fireworks-ai";
import { truncateTextPrompt } from "@/lib/text-prompt";

import type { AgentToolCall, AgentToolDefinition } from "@/lib/studio-pro/agent-tools";
import { parseAgentToolCall } from "@/lib/studio-pro/agent-tools";

const FIREWORKS_API_BASE = "https://api.fireworks.ai/inference/v1";

export type AgentChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

type FireworksChoice = {
  message?: {
    content?: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
};

type FireworksResponse = {
  choices?: FireworksChoice[];
  error?: { message?: string };
};

function getApiKey() {
  const key = process.env.FIREWORKS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FIREWORKS_API_KEY is required for the Studio agent. Get a key at https://fireworks.ai",
    );
  }
  return key;
}

function parseJsonToolCallsFromContent(content: string): AgentToolCall[] {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
  if (!jsonMatch) return [];

  const raw = jsonMatch[1] ?? jsonMatch[0];
  try {
    const parsed = JSON.parse(raw) as {
      tool_calls?: Array<{ name: string; arguments?: Record<string, unknown> }>;
    };
    if (!Array.isArray(parsed.tool_calls)) return [];

    return parsed.tool_calls
      .map((call, index) =>
        parseAgentToolCall({
          id: `fallback-${index}`,
          name: call.name,
          arguments: JSON.stringify(call.arguments ?? {}),
        }),
      )
      .filter((call): call is AgentToolCall => call !== null);
  } catch {
    return [];
  }
}

export async function fireworksAgentChat(input: {
  messages: AgentChatMessage[];
  tools: AgentToolDefinition[];
  max_tokens?: number;
  temperature?: number;
  model?: string;
}) {
  const model = resolveFireworksTextModel(input.model);
  const messages = input.messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: message.role,
        tool_call_id: message.tool_call_id,
        content: truncateTextPrompt(message.content),
      };
    }
    if (message.role === "assistant" && message.tool_calls?.length) {
      return {
        role: message.role,
        content: message.content,
        tool_calls: message.tool_calls,
      };
    }
    return {
      role: message.role,
      content: truncateTextPrompt(message.content ?? ""),
    };
  });

  const response = await fetch(`${FIREWORKS_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: input.tools,
      tool_choice: "auto",
      max_tokens: input.max_tokens ?? 1024,
      temperature: input.temperature ?? 0.3,
      thinking: { type: "disabled" },
    }),
  });

  const data = (await response.json()) as FireworksResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Fireworks agent request failed (${response.status}).`);
  }

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("Fireworks agent returned an empty response.");
  }

  const rawToolCalls = message.tool_calls ?? [];
  let toolCalls = rawToolCalls
    .map((call) =>
      parseAgentToolCall({
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      }),
    )
    .filter((call): call is AgentToolCall => call !== null);

  const content = message.content?.trim() || null;

  if (toolCalls.length === 0 && content) {
    toolCalls = parseJsonToolCallsFromContent(content);
  }

  return {
    content,
    toolCalls,
    rawToolCalls: rawToolCalls.map((call) => ({
      id: call.id,
      type: "function" as const,
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      },
    })),
  };
}

type StreamToolCallPart = {
  index?: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: StreamToolCallPart[];
    };
  }>;
  error?: { message?: string };
};

function finalizeStreamToolCalls(
  parts: Map<number, { id: string; name: string; arguments: string }>,
) {
  const rawToolCalls = Array.from(parts.entries())
    .sort(([a], [b]) => a - b)
    .map(([, call]) => ({
      id: call.id,
      type: "function" as const,
      function: {
        name: call.name,
        arguments: call.arguments,
      },
    }));

  const toolCalls = rawToolCalls
    .map((call) =>
      parseAgentToolCall({
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      }),
    )
    .filter((call): call is AgentToolCall => call !== null);

  return { toolCalls, rawToolCalls };
}

export async function streamFireworksAgentChat(input: {
  messages: AgentChatMessage[];
  tools: AgentToolDefinition[];
  max_tokens?: number;
  temperature?: number;
  model?: string;
  onDelta?: (content: string) => void | Promise<void>;
}) {
  const model = resolveFireworksTextModel(input.model);
  const messages = input.messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: message.role,
        tool_call_id: message.tool_call_id,
        content: truncateTextPrompt(message.content),
      };
    }
    if (message.role === "assistant" && message.tool_calls?.length) {
      return {
        role: message.role,
        content: message.content,
        tool_calls: message.tool_calls,
      };
    }
    return {
      role: message.role,
      content: truncateTextPrompt(message.content ?? ""),
    };
  });

  const response = await fetch(`${FIREWORKS_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: input.tools,
      tool_choice: "auto",
      stream: true,
      max_tokens: input.max_tokens ?? 1024,
      temperature: input.temperature ?? 0.3,
      thinking: { type: "disabled" },
    }),
  });

  if (!response.ok) {
    let message = `Fireworks agent stream failed (${response.status}).`;
    try {
      const data = (await response.json()) as FireworksResponse;
      if (data.error?.message) message = data.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Fireworks agent stream unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolParts = new Map<number, { id: string; name: string; arguments: string }>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue;
      }

      if (chunk.error?.message) {
        throw new Error(chunk.error.message);
      }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        await input.onDelta?.(delta.content);
      }

      if (delta.tool_calls) {
        for (const part of delta.tool_calls) {
          const index = part.index ?? 0;
          const current = toolParts.get(index) ?? { id: "", name: "", arguments: "" };
          if (part.id) current.id = part.id;
          if (part.function?.name) current.name = part.function.name;
          if (part.function?.arguments) current.arguments += part.function.arguments;
          toolParts.set(index, current);
        }
      }
    }
  }

  const trimmedContent = content.trim() || null;
  const finalized = finalizeStreamToolCalls(toolParts);
  const { rawToolCalls } = finalized;
  let toolCalls = finalized.toolCalls;

  if (toolCalls.length === 0 && trimmedContent) {
    toolCalls = parseJsonToolCallsFromContent(trimmedContent);
  }

  return {
    content: trimmedContent,
    toolCalls,
    rawToolCalls,
  };
}
