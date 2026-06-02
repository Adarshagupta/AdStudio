import type { GenerationFormat } from "@prisma/client";

export type GenerationStyle = {
  aspectRatio: string;
  captionStyle: string;
  musicEnabled: boolean;
  duration: number;
  resolution: string;
};

export const defaultGenerationStyle: GenerationStyle = {
  aspectRatio: "9:16",
  captionStyle: "Clean",
  musicEnabled: true,
  duration: 10,
  resolution: "480p",
};

export type GenerationJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type GenerationStartResult = {
  jobId: string;
  scriptText?: string;
  status: GenerationJobStatus;
  error?: string;
};

export async function startGeneration(input: {
  format: GenerationFormat;
  prompt: string;
  productUrl?: string;
  avatarId?: string;
  scriptText?: string;
  model?: string;
  style?: Partial<GenerationStyle>;
}): Promise<GenerationStartResult> {
  const style = { ...defaultGenerationStyle, ...input.style };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: input.format,
      prompt: input.prompt,
      productUrl: input.productUrl ?? "",
      avatarId: input.avatarId ?? null,
      scriptText: input.scriptText ?? "",
      model: input.model,
      style,
    }),
  });

  const data = (await response.json()) as {
    jobId?: string;
    generationId?: string;
    scriptText?: string;
    status?: GenerationJobStatus;
    videoUrl?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Generation request failed.");
  }

  const jobId = data.jobId ?? data.generationId;
  if (!jobId) {
    throw new Error("Generation request did not return a job id.");
  }

  return {
    jobId,
    scriptText: data.scriptText,
    status: data.status ?? "PROCESSING",
    error: data.error,
  };
}

export async function fetchGenerationStatus(jobId: string) {
  const response = await fetch(`/api/generate/${jobId}/status`);
  const data = (await response.json()) as {
    status?: GenerationJobStatus;
    videoUrl?: string;
    scriptText?: string;
    errorMessage?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.errorMessage ?? data.error ?? "Status polling failed.");
  }

  return data;
}

export async function pollGenerationUntilComplete(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    onStatus?: (status: GenerationJobStatus) => void;
  },
) {
  const intervalMs = options?.intervalMs ?? 5000;
  const maxAttempts = options?.maxAttempts ?? 180;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const data = await fetchGenerationStatus(jobId);
    if (data.status) {
      options?.onStatus?.(data.status);
    }

    if (data.status === "COMPLETED" && data.videoUrl) {
      return { videoUrl: data.videoUrl, status: data.status };
    }

    if (data.status === "FAILED") {
      throw new Error(data.errorMessage ?? "Generation failed.");
    }
  }

  throw new Error("Timed out waiting for video generation.");
}
