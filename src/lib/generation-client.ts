import type { GenerationFormat } from "@prisma/client";

import type { DashboardOutputType } from "@/lib/dashboard-generation";
import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";

export type GenerationStyle = {
  aspectRatio: string;
  captionStyle: string;
  musicEnabled: boolean;
  duration: number;
  resolution: string;
  outputType?: DashboardOutputType;
};

export const defaultGenerationStyle: GenerationStyle = {
  aspectRatio: "9:16",
  captionStyle: "Clean",
  musicEnabled: true,
  duration: 10,
  resolution: "1080p",
};

export type GenerationJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type GenerationStartResult = {
  jobId: string;
  scriptText?: string;
  status: GenerationJobStatus;
  outputType?: DashboardOutputType;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  error?: string;
};

export class GenerationStatusPollingError extends Error {
  readonly status?: number;
  readonly transient: boolean;

  constructor(message: string, options?: { status?: number; transient?: boolean }) {
    super(message);
    this.name = "GenerationStatusPollingError";
    this.status = options?.status;
    this.transient = options?.transient ?? false;
  }
}

function isRetryableStatusCode(status?: number) {
  return status === undefined || status === 408 || status === 425 || status === 429 || status >= 500;
}

export function isTransientGenerationStatusError(error: unknown) {
  return error instanceof GenerationStatusPollingError && error.transient;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function startGeneration(input: {
  outputType?: DashboardOutputType;
  format: GenerationFormat;
  prompt: string;
  productUrl?: string;
  avatarId?: string;
  scriptText?: string;
  model?: string;
  adhereToScript?: boolean;
  shotNotes?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;
  videoOperation?: "auto" | "edit" | "extend" | "control";
  style?: Partial<GenerationStyle>;
}): Promise<GenerationStartResult> {
  const style = { ...defaultGenerationStyle, ...input.style };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outputType: input.outputType ?? "video",
      format: input.format,
      prompt: input.prompt,
      productUrl: input.productUrl ?? "",
      avatarId: input.avatarId ?? null,
      scriptText: input.scriptText ?? "",
      model: input.model,
      adhereToScript: input.adhereToScript ?? false,
      shotNotes: input.shotNotes ?? "",
      referenceImageUrl: input.referenceImageUrl,
      referenceImageUrls: input.referenceImageUrls,
      referenceVideoUrl: input.referenceVideoUrl,
      videoOperation: input.videoOperation,
      style,
    }),
  });

  const data = await readJsonResponse<{
    jobId?: string;
    generationId?: string;
    scriptText?: string;
    status?: GenerationJobStatus;
    outputType?: DashboardOutputType;
    imageUrl?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(responseErrorMessage(response, data, "Generation request failed."));
  }

  const jobId = data.jobId ?? data.generationId;
  if (!jobId) {
    throw new Error("Generation request did not return a job id.");
  }

  return {
    jobId,
    scriptText: data.scriptText,
    status: data.status ?? "PROCESSING",
    outputType: data.outputType,
    imageUrl: data.imageUrl ?? data.thumbnailUrl,
    thumbnailUrl: data.thumbnailUrl,
    videoUrl: data.videoUrl,
    error: data.error,
  };
}

export async function fetchGenerationStatus(jobId: string) {
  let response: Response;

  try {
    response = await fetch(`/api/generate/${jobId}/status`, { cache: "no-store" });
  } catch (error) {
    throw new GenerationStatusPollingError(errorMessage(error, "Status polling failed."), {
      transient: true,
    });
  }

  let data: {
    status?: GenerationJobStatus;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    scriptText?: string | null;
    errorMessage?: string | null;
    error?: string;
  };

  try {
    data = await readJsonResponse(response);
  } catch (error) {
    const message = errorMessage(error, "Status polling failed.");
    throw new GenerationStatusPollingError(`${message}. Refresh the job status in a moment.`, {
      status: response.status,
      transient: isRetryableStatusCode(response.status),
    });
  }

  if (!response.ok) {
    throw new GenerationStatusPollingError(
      data.errorMessage ?? data.error ?? responseErrorMessage(response, data, "Status polling failed."),
      {
        status: response.status,
        transient: isRetryableStatusCode(response.status),
      },
    );
  }

  return data;
}

export async function pollGenerationUntilComplete(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    maxTransientErrors?: number;
    onStatus?: (status: GenerationJobStatus) => void;
  },
) {
  const intervalMs = options?.intervalMs ?? 5000;
  const maxAttempts = options?.maxAttempts ?? 240;
  const maxTransientErrors = options?.maxTransientErrors ?? 18;
  let transientErrors = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    let data: Awaited<ReturnType<typeof fetchGenerationStatus>>;

    try {
      data = await fetchGenerationStatus(jobId);
      transientErrors = 0;
    } catch (error) {
      if (isTransientGenerationStatusError(error) && transientErrors < maxTransientErrors) {
        transientErrors += 1;
        options?.onStatus?.("PROCESSING");
        continue;
      }

      throw error;
    }

    if (data.status) {
      options?.onStatus?.(data.status);
    }

    if (data.status === "COMPLETED" && data.videoUrl) {
      return {
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl ?? undefined,
        status: data.status,
      };
    }

    if (data.status === "COMPLETED" && !data.videoUrl) {
      options?.onStatus?.("PROCESSING");
      continue;
    }

    if (data.status === "FAILED") {
      throw new Error(data.errorMessage ?? "Generation failed.");
    }
  }

  throw new Error("Timed out waiting for video generation.");
}
