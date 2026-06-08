import type { AgentToolCall } from "@/lib/studio-pro/agent-tools";

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | {
      type: "done";
      content: string | null;
      toolCalls: AgentToolCall[];
      rawToolCalls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { type: "error"; error: string };

export type AgentStreamResult = Extract<AgentStreamEvent, { type: "done" }>;

export function agentToolLabel(name: string) {
  const labels: Record<string, string> = {
    add_node: "Adding node",
    update_node: "Updating node",
    connect_nodes: "Connecting nodes",
    disconnect_node: "Disconnecting node",
    delete_node: "Removing node",
    apply_template: "Applying template",
    run_node: "Running node",
    run_all: "Running pipeline",
    select_node: "Focusing node",
    organize_canvas: "Organizing canvas",
    iterate_node: "Iterating node",
    list_assets: "Listing assets",
    attach_asset: "Attaching asset",
    undo_last_action: "Undoing",
    review_flow: "Reviewing flow",
    create_variants: "Creating variants",
    remember_flow: "Saving memory",
    list_connected_social: "Checking social accounts",
    publish_to_social: "Publishing to social",
  };
  return labels[name] ?? name;
}

export async function consumeAgentStream(
  response: Response,
  handlers: {
    onStatus?: (message: string) => void;
    onDelta?: (content: string) => void;
    onDone?: (result: AgentStreamResult) => void;
    onError?: (error: string) => void;
  },
) {
  if (!response.ok) {
    let error = `Studio agent failed (${response.status}).`;
    try {
      const data = (await response.json()) as {
        error?: string;
        errors?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
      };
      if (data.error) {
        error = data.error;
      } else if (data.errors?.formErrors?.length) {
        error = data.errors.formErrors.join(" ");
      }
    } catch {
      // ignore
    }
    handlers.onError?.(error);
    throw new Error(error);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Studio agent stream unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: AgentStreamResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const line = block
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) continue;

      const payload = line.slice(6).trim();
      if (!payload) continue;

      let event: AgentStreamEvent;
      try {
        event = JSON.parse(payload) as AgentStreamEvent;
      } catch {
        continue;
      }

      if (event.type === "status") {
        handlers.onStatus?.(event.message);
      } else if (event.type === "delta") {
        handlers.onDelta?.(event.content);
      } else if (event.type === "done") {
        result = event;
        handlers.onDone?.(event);
      } else if (event.type === "error") {
        handlers.onError?.(event.error);
        throw new Error(event.error);
      }
    }
  }

  if (!result) {
    throw new Error("Studio agent ended without a response.");
  }

  return result;
}
