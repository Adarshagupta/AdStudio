"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveStudioFlow } from "@/lib/studio-pro/flow-client";
import { notify } from "@/lib/notify";
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
  collaboration?: { clientId?: string; deferScheduledSave?: boolean },
) {
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const latestRef = useRef(state);
  const savedSnapshotRef = useRef(snapshotOf(initialState));
  const timerRef = useRef<number | null>(null);
  const clientIdRef = useRef(collaboration?.clientId);
  const isMountedRef = useRef(true);
  clientIdRef.current = collaboration?.clientId;

  latestRef.current = state;

  const isDirty = useCallback(() => snapshotOf(latestRef.current) !== savedSnapshotRef.current, []);

  const persist = useCallback(
    async (options?: { keepalive?: boolean; silent?: boolean }) => {
      if (!isDirty()) {
        if (isMountedRef.current) {
          setSaveState("saved");
        }
        return true;
      }

      try {
        await saveStudioFlow(sessionId, latestRef.current, {
          keepalive: options?.keepalive,
          clientId: clientIdRef.current,
        });
        savedSnapshotRef.current = snapshotOf(latestRef.current);
        if (isMountedRef.current) {
          setSaveState("saved");
        }
        return true;
      } catch (error) {
        if (options?.silent) {
          return false;
        }
        if (isMountedRef.current) {
          setSaveState("error");
          notify.error(error instanceof Error ? error.message : "Could not save flow.");
        }
        return false;
      }
    },
    [isDirty, sessionId],
  );

  const persistOnExit = useCallback(async () => {
    await persist({ keepalive: true, silent: true });
  }, [persist]);

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isMountedRef.current) {
      setSaveState("saving");
    }
    return persist();
  }, [persist]);

  const scheduleSave = useCallback(() => {
    if (!isDirty()) {
      if (isMountedRef.current) {
        setSaveState("saved");
      }
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    if (isMountedRef.current) {
      setSaveState("saving");
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void persist();
    }, SAVE_DEBOUNCE_MS);
  }, [isDirty, persist]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (collaboration?.deferScheduledSave) {
      return undefined;
    }

    scheduleSave();
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [collaboration?.deferScheduledSave, state.nodes, state.edges, state.viewport, scheduleSave]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden" || !isDirty()) return;
      void persistOnExit();
    };

    const flushOnUnload = () => {
      if (!isDirty()) return;
      void persistOnExit();
    };

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnUnload);

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnUnload);

      if (isDirty()) {
        void persistOnExit();
      }
    };
  }, [isDirty, persistOnExit]);

  const markSynced = useCallback((snapshot?: StudioFlowPersistState) => {
    savedSnapshotRef.current = snapshotOf(snapshot ?? latestRef.current);
    if (isMountedRef.current) {
      setSaveState("saved");
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { saveState, flushSave, markSynced };
}
