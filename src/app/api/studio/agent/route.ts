import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import type { AgentChatMessage } from "@/lib/fireworks-agent";
import { fireworksAgentChat, streamFireworksAgentChat } from "@/lib/fireworks-agent";
import { buildStudioFlowSummary, type StudioFlowSummary } from "@/lib/studio-pro/agent-summary";
import type { AgentStreamEvent } from "@/lib/studio-pro/agent-stream";
import type { StudioAgentBrandContext } from "@/lib/studio-pro/agent-brand-context";
import type { StudioAgentCollabContext } from "@/lib/studio-pro/agent-collab";
import { sanitizeFlowMemory } from "@/lib/studio-pro/agent-memory";
import { buildStudioAgentSystemPrompt } from "@/lib/studio-pro/agent-system";
import { studioAgentTools } from "@/lib/studio-pro/agent-tools";
import { parseRequestJson } from "@/lib/http/json";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(8000) }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().nullable().optional(),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal("function"),
          function: z.object({
            name: z.string(),
            arguments: z.string(),
          }),
        }),
      )
      .optional(),
  }),
  z.object({
    role: z.literal("tool"),
    tool_call_id: z.string(),
    content: z.string().max(12000),
  }),
]);

const brandContextSchema = z
  .object({
    workspaceName: z.string().max(120).optional(),
    companyName: z.string().max(120).optional(),
    brandTone: z.string().max(200).optional(),
    targetAudience: z.string().max(200).optional(),
    defaultAspectRatio: z.string().max(16).optional(),
  })
  .nullish();

const flowMemorySchema = z
  .object({
    summary: z.string().max(500).optional(),
    preferences: z.record(z.string().max(240)).optional(),
  })
  .nullish();

const collabContextSchema = z
  .object({
    activeTeammates: z.array(
      z.object({
        userId: z.string(),
        name: z.string(),
        clientId: z.string(),
      }),
    ),
    peerFocusNodes: z.array(
      z.object({
        userId: z.string(),
        name: z.string(),
        nodeId: z.string(),
      }),
    ),
  })
  .nullish();

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(48),
  nodes: z.array(z.custom<StudioNode>()),
  edges: z.array(z.custom<StudioEdge>()),
  brandContext: brandContextSchema,
  flowMemory: flowMemorySchema,
  collabContext: collabContextSchema,
  stream: z.boolean().optional(),
});

function encodeStreamEvent(event: AgentStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to the Studio agent." }, { status: 403 });
  }

  const body = await parseRequestJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
      .join("; ");
    return NextResponse.json(
      { error: `Invalid agent request (${detail}).`, errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const flowSummary: StudioFlowSummary = buildStudioFlowSummary(parsed.data.nodes, parsed.data.edges);
  const brandContext = (parsed.data.brandContext ?? null) as StudioAgentBrandContext | null;
  const flowMemory = sanitizeFlowMemory(parsed.data.flowMemory ?? undefined);
  const collabContext = (parsed.data.collabContext ?? null) as StudioAgentCollabContext | null;
  const systemPrompt = buildStudioAgentSystemPrompt(flowSummary, brandContext, {
    memory: flowMemory,
    collab: collabContext,
  });

  const llmMessages: AgentChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...parsed.data.messages.map((message): AgentChatMessage => {
      if (message.role === "user") {
        return { role: "user", content: message.content };
      }
      if (message.role === "tool") {
        return {
          role: "tool",
          tool_call_id: message.tool_call_id,
          content: message.content,
        };
      }
      return {
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      };
    }),
  ];

  if (parsed.data.stream) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AgentStreamEvent) => {
          controller.enqueue(encoder.encode(encodeStreamEvent(event)));
        };

        try {
          const result = await streamFireworksAgentChat({
            messages: llmMessages,
            tools: studioAgentTools,
            temperature: 0.55,
            max_tokens: 512,
            onDelta: async (content) => {
              send({ type: "delta", content });
            },
          });

          send({
            type: "done",
            content: result.content,
            toolCalls: result.toolCalls,
            rawToolCalls: result.rawToolCalls,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Studio agent failed.";
          send({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const result = await fireworksAgentChat({
      messages: llmMessages,
      tools: studioAgentTools,
      max_tokens: 1024,
    });

    return NextResponse.json({
      content: result.content,
      toolCalls: result.toolCalls,
      rawToolCalls: result.rawToolCalls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Studio agent failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
