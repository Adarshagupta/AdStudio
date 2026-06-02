import { useCallback, useEffect, useRef, useState } from "react";

import { saveStudioFlow } from "@/lib/studio-pro/flow-client";
import type { StudioViewport } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const SAVE_DEBOUNCE_MS = 600;

export type StudioFlowPersistState = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: StudioViewport;
};

function snapshotOf(state: StudioFlowPersistState) {
  return JSON.stringify(state);
}

export function useStudioFlowAutoSave(
  sessionId: string,
  state: StudioFlowPersistState,
  initialState: StudioFlowPersistState,
) {
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const latestRef = useRef(state);
  const savedSnapshotRef = useRef(snapshotOf(initialState));
  const timerRef = useRef<number | null>(null);

  latestRef.current = state;

  const isDirty = useCallback(() => snapshotOf(latestRef.current) !== savedSnapshotRef.current, []);

  const persist = useCallback(
    async (options?: { keepalive?: boolean }) => {
      if (!isDirty()) {
        setSaveState("saved");
        return true;
      }

      try {
        await saveStudioFlow(sessionId, latestRef.current, options);
        savedSnapshotRef.current = snapshotOf(latestRef.current);
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [isDirty, sessionId],
  );

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSaveState("saving");
    return persist();
  }, [persist]);

  const scheduleSave = useCallback(() => {
    if (!isDirty()) {
      setSaveState("saved");
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setSaveState("saving");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void persist();
    }, SAVE_DEBOUNCE_MS);
  }, [isDirty, persist]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.nodes, state.edges, state.viewport, scheduleSave]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden" || !isDirty()) return;
      void persist({ keepalive: true });
    };

    const flushOnUnload = () => {
      if (!isDirty()) return;
      void saveStudioFlow(sessionId, latestRef.current, { keepalive: true });
    };

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnUnload);

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnUnload);

      if (isDirty()) {
        void saveStudioFlow(sessionId, latestRef.current, { keepalive: true });
      }
    };
  }, [isDirty, persist, sessionId]);

  return { saveState, flushSave };
}
