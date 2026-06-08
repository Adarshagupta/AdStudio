import "server-only";

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { getAppUrl } from "@/lib/integrations/app-url";
import { prisma } from "@/lib/db";
import { putR2Object, studioUploadUsesR2 } from "@/lib/r2";
import { registerUserMediaAsset } from "@/lib/user-media-assets";

export type LongFormClipInput = {
  nodeId?: string;
  generationId?: string;
  title?: string;
  prompt?: string;
  videoUrl: string;
  durationSec?: number;
};

export type LongFormRenderSettings = {
  resolution?: string;
  aspectRatio?: string;
  fps?: number;
  source?: "studio-pro";
};

type LongFormJobRecord = Awaited<ReturnType<typeof getLongFormVideo>>;

function ffmpegBinary() {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''");
}

function clipExtension(contentType: string | null) {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  if (type === "video/webm") return ".webm";
  if (type === "video/quicktime") return ".mov";
  return ".mp4";
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegBinary(), args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const stderr: Buffer[] = [];

    child.stderr.on("data", (chunk) => {
      stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "ffmpeg is required for long-form export. Install ffmpeg or set FFMPEG_PATH in the server environment.",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const message = Buffer.concat(stderr).toString("utf8").trim();
      reject(new Error(message || `ffmpeg exited with code ${code}.`));
    });
  });
}

async function uploadRenderedVideo(input: {
  userId: string;
  workspaceId: string;
  title: string;
  filePath: string;
  requestOrOrigin?: Request | string;
  durationSec?: number | null;
}) {
  const buffer = await readFile(input.filePath);
  const fileName = `${sanitizeFileName(input.title) || "long-form-video"}-${randomUUID()}.mp4`;
  const key = `assets/${input.userId}/video/${fileName}`;

  let url: string;
  if (studioUploadUsesR2()) {
    url = await putR2Object(key, buffer, "video/mp4");
  } else {
    const relativeDir = path.join("assets", input.userId, "video");
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const destination = path.join(absoluteDir, fileName);
    await writeFile(destination, buffer);
    url = `${getAppUrl(input.requestOrOrigin)}/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
  }

  await registerUserMediaAsset({
    userId: input.userId,
    workspaceId: input.workspaceId,
    kind: "video",
    source: "GENERATED",
    url,
    name: input.title,
    mimeType: "video/mp4",
    durationSec: input.durationSec ?? null,
    byteSize: buffer.length,
  });

  return url;
}

export async function getLongFormVideo(jobId: string) {
  return prisma.studioLongFormVideo.findUnique({
    where: { id: jobId },
    include: { segments: { orderBy: { index: "asc" } } },
  });
}

export async function createLongFormVideoJob(input: {
  userId: string;
  workspaceId: string;
  studioFlowId?: string | null;
  title?: string;
  prompt?: string;
  targetDurationSec?: number;
  settings?: LongFormRenderSettings;
  clips: LongFormClipInput[];
}) {
  const title = input.title?.trim() || "Long-form Studio export";
  const inferredDurationSec = input.clips.reduce(
    (total, clip) => total + (clip.durationSec ?? 0),
    0,
  );
  const targetDurationSec = input.targetDurationSec ?? (inferredDurationSec || undefined);

  return prisma.studioLongFormVideo.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      studioFlowId: input.studioFlowId || null,
      title,
      prompt: input.prompt?.trim() || null,
      targetDurationSec,
      status: "QUEUED",
      settings: input.settings ?? {},
      thumbnailUrl: input.clips[0]?.videoUrl,
      segments: {
        create: input.clips.map((clip, index) => ({
          index,
          nodeId: clip.nodeId || null,
          generationId: clip.generationId || null,
          title: clip.title?.trim() || `Segment ${index + 1}`,
          prompt: clip.prompt?.trim() || null,
          status: "QUEUED",
          videoUrl: clip.videoUrl,
          durationSec: clip.durationSec ?? null,
        })),
      },
    },
    include: { segments: { orderBy: { index: "asc" } } },
  });
}

async function markJobFailed(jobId: string, message: string) {
  return prisma.studioLongFormVideo.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
      segments: {
        updateMany: {
          where: { status: { in: ["QUEUED", "PROCESSING"] } },
          data: { status: "FAILED", errorMessage: message },
        },
      },
    },
    include: { segments: { orderBy: { index: "asc" } } },
  });
}

export async function renderLongFormVideo(
  jobId: string,
  options?: { requestOrOrigin?: Request | string },
): Promise<NonNullable<LongFormJobRecord>> {
  const job = await getLongFormVideo(jobId);
  if (!job) {
    throw new Error("Long-form job not found.");
  }

  if (job.status === "COMPLETED") {
    return job;
  }

  const clips = job.segments.filter((segment) => segment.videoUrl);
  if (clips.length < 2) {
    const failed = await markJobFailed(job.id, "Long-form export requires at least two completed video segments.");
    return failed;
  }

  const startedAt = new Date();
  await prisma.studioLongFormVideo.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      startedAt,
      errorMessage: null,
      segments: {
        updateMany: {
          where: { longFormVideoId: job.id },
          data: { status: "PROCESSING", startedAt, errorMessage: null },
        },
      },
    },
  });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "studio-long-form-"));
  const outputPath = path.join(tempDir, "output.mp4");

  try {
    const clipPaths: string[] = [];
    for (let index = 0; index < clips.length; index += 1) {
      const clip = clips[index]!;
      const response = await fetch(clip.videoUrl!);
      if (!response.ok) {
        throw new Error(`Could not download ${clip.title} (${response.status}).`);
      }
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.toLowerCase().startsWith("video/")) {
        throw new Error(`${clip.title} is not a video (${contentType}).`);
      }
      const extension = clipExtension(contentType);
      const clipPath = path.join(tempDir, `clip-${String(index).padStart(3, "0")}${extension}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) {
        throw new Error(`${clip.title} downloaded as an empty file.`);
      }
      await writeFile(clipPath, buffer);
      clipPaths.push(clipPath);
    }

    const concatList = clipPaths.map((clipPath) => `file '${escapeConcatPath(clipPath)}'`).join("\n");
    const concatListPath = path.join(tempDir, "clips.txt");
    await writeFile(concatListPath, `${concatList}\n`);

    try {
      await runFfmpeg([
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    } catch {
      await runFfmpeg([
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    }

    const finalVideoUrl = await uploadRenderedVideo({
      userId: job.userId,
      workspaceId: job.workspaceId,
      title: job.title,
      filePath: outputPath,
      requestOrOrigin: options?.requestOrOrigin,
      durationSec: job.targetDurationSec,
    });
    const completedAt = new Date();

    return prisma.studioLongFormVideo.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        finalVideoUrl,
        errorMessage: null,
        completedAt,
        renderTimeMs: completedAt.getTime() - startedAt.getTime(),
        segments: {
          updateMany: {
            where: { longFormVideoId: job.id },
            data: { status: "COMPLETED", completedAt },
          },
        },
      },
      include: { segments: { orderBy: { index: "asc" } } },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Long-form render failed.";
    const failed = await markJobFailed(job.id, message);
    throw Object.assign(new Error(message), { job: failed });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
