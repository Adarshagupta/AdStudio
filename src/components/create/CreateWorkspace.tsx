"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { PreviewPanel, type PreviewStatus } from "@/components/create/PreviewPanel";
import { UGCWorkspace } from "@/components/create/UGCWorkspace";
import { BrainRotWorkspace } from "@/components/create/BrainRotWorkspace";
import { ReviewWorkspace } from "@/components/create/ReviewWorkspace";
import { SplitScreenWorkspace } from "@/components/create/SplitScreenWorkspace";
import {
  defaultGenerationStyle,
  startGeneration,
} from "@/lib/generation-client";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { notify } from "@/lib/notify";
import type { GenerationFormat } from "@prisma/client";

export function CreateWorkspace({
  format,
  avatars,
  initialPrompt = "",
  autostart = false,
}: {
  format: GenerationFormat;
  title: string;
  avatars: Array<{
    id: string;
    name: string;
    previewUrl: string;
    isSystem: boolean;
  }>;
  initialPrompt?: string;
  autostart?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const hasAutostarted = useRef(false);

  async function handleGenerateScript(payload: { productDescription: string; productUrl: string }) {
    setIsGeneratingScript(true);
    setError(undefined);

    try {
      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          prompt: payload.productDescription,
          productUrl: payload.productUrl,
        }),
      });

      const data = await readJsonResponse<{ scriptText?: string; error?: string }>(response);

      if (!response.ok || !data.scriptText) {
        throw new Error(responseErrorMessage(response, data, "Script generation failed."));
      }

      return data.scriptText;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Script generation failed.";
      setError(message);
      notify.error(message);
      throw err;
    } finally {
      setIsGeneratingScript(false);
    }
  }

  async function handleGenerate(payload: Record<string, unknown>) {
    setIsSubmitting(true);
    setError(undefined);
    setStatus("queued");

    try {
      const started = await startGeneration({
        format,
        prompt: (payload.productDescription as string) ?? "",
        productUrl: (payload.productUrl as string) ?? "",
        avatarId: (payload.avatarId as string) ?? "",
        scriptText: (payload.scriptText as string) ?? "",
        style: {
          aspectRatio: (payload.aspectRatio as string) ?? "9:16",
          captionStyle: (payload.captionStyle as string) ?? "Clean",
          musicEnabled: (payload.musicEnabled as boolean) ?? true,
          duration: (payload.duration as number) ?? 10,
          resolution: (payload.resolution as string) ?? "480p",
        },
      });

      router.push(`/generations/${started.jobId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setStatus("failed");
      setError(message);
      notify.error(message);
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    const prompt = initialPrompt.trim();
    if (!autostart || prompt.length < 10 || hasAutostarted.current) {
      return;
    }

    hasAutostarted.current = true;

    void handleGenerate({
      productDescription: prompt,
      productUrl: "",
      avatarId: avatars[0]?.id ?? "",
      scriptText: "",
      ...defaultGenerationStyle,
    });
  }, [autostart, avatars, initialPrompt]);

  const workspaceProps = {
    isSubmitting,
    isGeneratingScript,
    initialPrompt,
    onGenerate: handleGenerate,
    onGenerateScript: handleGenerateScript,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {format === "UGC" && (
          <UGCWorkspace avatars={avatars} {...workspaceProps} />
        )}
        {format === "BRAIN_ROT" && (
          <BrainRotWorkspace {...workspaceProps} />
        )}
        {format === "REVIEW" && (
          <ReviewWorkspace {...workspaceProps} />
        )}
        {format === "STATIC" && (
          <SplitScreenWorkspace {...workspaceProps} />
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <PreviewPanel status={status} isLoading={isSubmitting} error={error} />
      </motion.div>
    </div>
  );
}
