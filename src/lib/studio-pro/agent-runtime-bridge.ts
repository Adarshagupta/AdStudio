import type { StudioAgentFlowMemory } from "@/lib/studio-pro/agent-memory";
import { emptyFlowMemory } from "@/lib/studio-pro/agent-memory";
import type { AgentCanvasSnapshot } from "@/lib/studio-pro/agent-undo";

export type AgentRuntimeBridge = {
  memory: StudioAgentFlowMemory;
  undoSnapshot: AgentCanvasSnapshot | null;
  creditsRemaining?: number;
  onUndoAvailableChange?: (available: boolean) => void;
};

export function createAgentRuntimeBridge(creditsRemaining?: number): AgentRuntimeBridge {
  return {
    memory: emptyFlowMemory(),
    undoSnapshot: null,
    creditsRemaining,
  };
}
