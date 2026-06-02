"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PreviewPanel, type PreviewStatus } from "@/components/create/PreviewPanel";
import { StepForm, type GeneratePayload } from "@/components/create/StepForm";
import {
  defaultGenerationStyle,
  startGeneration,
} from "@/lib/generation-client";
import type { GenerationFormat } from "@prisma/client";

export function CreateWorkspace({
  format,
  title,
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

  async function handleGenerateScript(payload: Pick<GeneratePayload, "productDescription" | "productUrl">) {
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

      const data = (await response.json()) as { scriptText?: string; error?: string };

      if (!response.ok || !data.scriptText) {
        throw new Error(data.error ?? "Script generation failed.");
      }

      return data.scriptText;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Script generation failed.");
      throw err;
    } finally {
      setIsGeneratingScript(false);
    }
  }

  async function handleGenerate(payload: GeneratePayload) {
    setIsSubmitting(true);
    setError(undefined);
    setStatus("queued");

    try {
      const started = await startGeneration({
        format,
        prompt: payload.productDescription,
        productUrl: payload.productUrl,
        avatarId: payload.avatarId,
        scriptText: payload.scriptText,
        style: {
          aspectRatio: payload.aspectRatio,
          captionStyle: payload.captionStyle,
          musicEnabled: payload.musicEnabled,
          duration: payload.duration,
          resolution: payload.resolution,
        },
      });

      router.push(`/generations/${started.jobId}`);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Generation failed.");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Advanced editor for avatar, script, and style controls.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <StepForm
          format={format}
          isSubmitting={isSubmitting}
          isGeneratingScript={isGeneratingScript}
          avatars={avatars}
          initialPrompt={initialPrompt}
          onGenerate={handleGenerate}
          onGenerateScript={handleGenerateScript}
        />
        <PreviewPanel
          status={status}
          isLoading={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
}
