"use client";

import { motion } from "framer-motion";

import { LiteMoovPreloader } from "@/components/brand/LiteMoovPreloader";

export function WorkspaceSwitchOverlay({
  workspaceName,
  slow = false,
}: {
  workspaceName: string;
  slow?: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="status"
      aria-live="polite"
      aria-label={`Switching to ${workspaceName}`}
    >
      <LiteMoovPreloader
        fullscreen
        message={
          slow
            ? `Switching to ${workspaceName} — almost there…`
            : `Switching to ${workspaceName}`
        }
      />
    </motion.div>
  );
}
