import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import {
  getConfiguredLtxApiKeyCount,
  pollVideoGeneration,
  restartVideoGenerationWithNextKey,
} from "@/lib/video-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUS_POLL_TIMEOUT_MS = 55_000;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function statusJson<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isTransientStatusError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized === "status-poll-timeout" ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("too many requests") ||
    normalized.includes("429") ||
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504")
  );
}

async function pollWithTimeout(requestId: string) {
  return Promise.race([
    pollVideoGeneration(requestId),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("status-poll-timeout")), STATUS_POLL_TIMEOUT_MS);
    }),
  ]);
}

async function handleGetStatus(_: Request, { params }: { params: { jobId: string } }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return statusJson({ error: "Unauthorized" }, { status: 401 });
  }

  const generation = await prisma.generation.findFirst({
    where: {
      id: params.jobId,
      workspaceId: currentUser.workspace.id,
    },
  });

  if (!generation) {
    return statusJson({ error: "Generation job not found." }, { status: 404 });
  }

  if (generation.userId !== currentUser.user.id && !currentUserCan(currentUser, "viewLibrary")) {
    return statusJson({ error: "You do not have access to this generation." }, { status: 403 });
  }

  if (!generation.xaiRequestId || generation.status === "FAILED") {
    return statusJson(generation);
  }

  if (generation.status === "COMPLETED") {
    if (generation.videoUrl) {
      return statusJson(generation);
    }

    try {
      const status = await pollWithTimeout(generation.xaiRequestId);
      if (status.status === "done" && status.videoUrl) {
        const completedAt = generation.completedAt ?? new Date();
        const updated = await prisma.generation.update({
          where: { id: generation.id },
          data: {
            videoUrl: status.videoUrl,
            durationSec: status.durationSec ?? generation.durationSec,
            completedAt,
            renderTimeMs: generation.startedAt
              ? completedAt.getTime() - generation.startedAt.getTime()
              : generation.renderTimeMs,
          },
        });
        return statusJson(updated);
      }
    } catch (error) {
      const message = errorMessage(error, "Video finalize failed.");
      if (!isTransientStatusError(message)) {
        return statusJson({ ...generation, errorMessage: message });
      }
    }

    return statusJson(generation);
  }

  try {
    const status = await pollWithTimeout(generation.xaiRequestId);

    if (status.status === "done" && status.videoUrl) {
      const completedAt = new Date();
      const updated = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          videoUrl: status.videoUrl,
          durationSec: status.durationSec ?? generation.durationSec,
          completedAt,
          renderTimeMs: generation.startedAt
            ? completedAt.getTime() - generation.startedAt.getTime()
            : null,
        },
      });

      void createNotification({
        userId: generation.userId,
        workspaceId: generation.workspaceId,
        type: "GENERATION_COMPLETE",
        title: "Generation ready",
        message: "Your video finished rendering.",
        href: `/generations/${generation.id}`,
      }).catch(() => undefined);

      return statusJson(updated);
    }

    if (status.status === "failed" || status.status === "expired") {
      const errorMessage =
        ("errorMessage" in status && typeof status.errorMessage === "string"
          ? status.errorMessage
          : null) ?? `Video generation ${status.status}.`;
      const insufficientFunds =
        "insufficientFunds" in status && status.insufficientFunds === true;
      const keyIndex =
        "keyIndex" in status && typeof status.keyIndex === "number" ? status.keyIndex : 0;

      if (insufficientFunds && getConfiguredLtxApiKeyCount() > keyIndex + 1) {
        const restarted = await restartVideoGenerationWithNextKey({
          generation,
          currentKeyIndex: keyIndex,
        });

        if (restarted) {
          const updated = await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: "PROCESSING",
              xaiRequestId: restarted.requestId,
              errorMessage: null,
              startedAt: generation.startedAt ?? new Date(),
            },
          });

          return statusJson(updated);
        }
      }

      const updated = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          errorMessage,
        },
      });

      void createNotification({
        userId: generation.userId,
        workspaceId: generation.workspaceId,
        type: "GENERATION_FAILED",
        title: "Generation failed",
        message: errorMessage,
        href: `/generations/${generation.id}`,
      }).catch(() => undefined);

      return statusJson(updated);
    }

    return statusJson(generation);
  } catch (error) {
    const message = errorMessage(error, "Status polling failed.");

    if (isTransientStatusError(message)) {
      return statusJson(generation);
    }

    console.error("[generate/status] polling failed", {
      generationId: generation.id,
      requestId: generation.xaiRequestId,
      error: message,
    });

    const updated = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });

    void createNotification({
      userId: generation.userId,
      workspaceId: generation.workspaceId,
      type: "GENERATION_FAILED",
      title: "Generation failed",
      message,
      href: `/generations/${generation.id}`,
    }).catch(() => undefined);

    return statusJson(updated);
  }
}

export async function GET(request: Request, context: { params: { jobId: string } }) {
  try {
    return await handleGetStatus(request, context);
  } catch (error) {
    const message = errorMessage(error, "Status polling failed.");
    console.error("[generate/status] request failed", {
      jobId: context.params.jobId,
      error: message,
    });

    return statusJson(
      { error: message, errorMessage: message },
      { status: 500 },
    );
  }
}
