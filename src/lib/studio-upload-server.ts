import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getAppUrl } from "@/lib/integrations/app-url";
import { isR2Configured, isVercelDeployment, putR2Object, studioUploadUsesR2 } from "@/lib/r2";
import {
  allowedMimeTypeList,
  allowedMimeTypes,
  resolveStudioFileMime,
} from "@/lib/studio-upload-mime";

export type StudioUploadKind = "image" | "audio" | "video";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const MAX_VIDEO_BYTES = 48 * 1024 * 1024;
/** Vercel serverless request body limit (~4.5 MB); server-side R2 uploads must stay under this. */
const VERCEL_FORM_UPLOAD_MAX = 4 * 1024 * 1024;

export function maxBytesForKind(kind: StudioUploadKind) {
  const limit =
    kind === "image" ? MAX_IMAGE_BYTES : kind === "video" ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
  if (isVercelDeployment() && studioUploadUsesR2() && process.env.STUDIO_UPLOAD_DIRECT?.trim() !== "1") {
    return Math.min(limit, VERCEL_FORM_UPLOAD_MAX);
  }
  return limit;
}

export function validateStudioUploadFile(file: Pick<File, "name" | "type" | "size">, kind: StudioUploadKind) {
  const mime = resolveStudioFileMime(file, kind);

  if (!mime || !allowedMimeTypes(kind).has(mime)) {
    if (kind === "image") throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
    if (kind === "video") throw new Error("Use an MP4, WebM, or MOV video.");
    throw new Error("Use an MP3, WAV, WebM, OGG, or M4A audio file.");
  }

  const maxBytes = maxBytesForKind(kind);
  if (file.size > maxBytes) {
    if (kind === "image") {
      throw new Error(
        isVercelDeployment() && studioUploadUsesR2()
          ? "Image must be 4 MB or smaller on production."
          : "Image must be 12 MB or smaller.",
      );
    }
    if (kind === "video") throw new Error("Video must be 48 MB or smaller.");
    throw new Error("Audio must be 24 MB or smaller.");
  }

  return mime;
}

function extensionForMime(mime: string, fileName: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName) return fromName;

  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return ".mp3";
  if (mime === "audio/wav" || mime === "audio/x-wav") return ".wav";
  if (mime === "audio/webm") return ".webm";
  if (mime === "audio/ogg") return ".ogg";
  if (mime === "audio/mp4" || mime === "audio/x-m4a") return ".m4a";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  if (mime === "video/quicktime") return ".mov";
  return "";
}

/** Per-user folder layout in R2 / public disk: assets/{userId}/{kind}/… */
export function buildUserAssetObjectKey(userId: string, kind: StudioUploadKind, fileName: string) {
  return `assets/${userId}/${kind}/${fileName}`;
}

/** @deprecated Legacy studio path — prefer buildUserAssetObjectKey */
export function buildStudioObjectKey(workspaceId: string, kind: StudioUploadKind, fileName: string) {
  return `studio/${workspaceId}/${kind}/${fileName}`;
}

export function buildStudioFileName(contentType: string, originalName: string, kind: StudioUploadKind) {
  const ext =
    extensionForMime(contentType, originalName) ||
    (kind === "image" ? ".png" : kind === "video" ? ".mp4" : ".mp3");
  return `${crypto.randomUUID()}${ext}`;
}

async function storeOnDisk(
  userId: string,
  kind: StudioUploadKind,
  fileName: string,
  buffer: Buffer,
  request: Request,
) {
  const relativeDir = path.join("assets", userId, kind);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  await writeFile(absolutePath, buffer);

  const origin = getAppUrl(request);
  return `${origin}/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

export async function saveStudioAsset(input: {
  userId: string;
  workspaceId: string;
  kind: StudioUploadKind;
  buffer: Buffer;
  contentType: string;
  originalName: string;
  request: Request;
}) {
  const fileName = buildStudioFileName(input.contentType, input.originalName, input.kind);
  const key = buildUserAssetObjectKey(input.userId, input.kind, fileName);

  if (studioUploadUsesR2()) {
    if (!isR2Configured()) {
      throw new Error(
        "Cloudflare R2 is required in production. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.",
      );
    }

    const url = await putR2Object(key, input.buffer, input.contentType);
    return { url, storage: "r2" as const, byteSize: input.buffer.length };
  }

  const url = await storeOnDisk(input.userId, input.kind, fileName, input.buffer, input.request);
  return { url, storage: "disk" as const, byteSize: input.buffer.length };
}

export function blobClientUploadConstraints(kind: StudioUploadKind) {
  return {
    allowedContentTypes: allowedMimeTypeList(kind),
    maximumSizeInBytes: maxBytesForKind(kind),
  };
}
