import "server-only";

import { access, readFile } from "fs/promises";
import path from "path";

import {
  buildStudioFileName,
  buildUserAssetObjectKey,
  type StudioUploadKind,
} from "@/lib/studio-upload-server";
import { isR2Configured, putR2Object } from "@/lib/r2";

const MAX_STORED_ASSET_URL_CHARS = 2_048;

export function isDataMediaUrl(url: string | undefined | null) {
  return Boolean(url?.trim().startsWith("data:"));
}

export function isPublicHttpUrl(url: string | undefined | null) {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** External video/image providers (Sora, LTX, etc.) require publicly reachable HTTPS URLs. */
export function isProviderReadyHttpsUrl(url: string | undefined | null) {
  if (!url?.trim()) return false;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function mimeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".m4a":
      return "audio/mp4";
    default:
      return "application/octet-stream";
  }
}

function localPublicPathFromUrl(url: string) {
  let pathname: string;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") {
      return null;
    }
    pathname = parsed.pathname;
  } catch {
    if (!url.startsWith("/")) {
      return null;
    }
    pathname = url.split("?")[0] ?? url;
  }

  if (!pathname.startsWith("/assets/")) {
    return null;
  }

  const relative = pathname.replace(/^\//, "");
  const absolute = path.resolve(process.cwd(), "public", relative);
  const publicRoot = path.resolve(process.cwd(), "public");

  if (!absolute.startsWith(`${publicRoot}${path.sep}`)) {
    return null;
  }

  return absolute;
}

function parseDataUrl(url: string) {
  const trimmed = url.trim();
  const comma = trimmed.indexOf(",");
  if (!trimmed.startsWith("data:") || comma === -1) {
    throw new Error("Invalid embedded media URL.");
  }

  const header = trimmed.slice(5, comma);
  const payload = trimmed.slice(comma + 1).trim();
  const mime = header.split(";")[0]?.trim() || "application/octet-stream";
  const isBase64 = header.includes("base64");
  const buffer = Buffer.from(payload, isBase64 ? "base64" : "utf8");

  if (buffer.length === 0) {
    throw new Error("Embedded media URL is empty.");
  }

  return { mime, buffer };
}

async function uploadMediaBuffer(input: {
  buffer: Buffer;
  mime: string;
  userId: string;
  kind: StudioUploadKind;
  label: string;
}) {
  if (!isR2Configured()) {
    throw new Error(
      "Video generation requires HTTPS media URLs. Configure Cloudflare R2 (R2_PUBLIC_BASE_URL) or set STUDIO_STORAGE=r2 so uploads are stored with a public HTTPS URL.",
    );
  }

  const fileName = buildStudioFileName(input.mime, input.label, input.kind);
  const key = buildUserAssetObjectKey(input.userId, input.kind, fileName);
  return putR2Object(key, input.buffer, input.mime);
}

/** Load image/video/audio bytes from data URLs, local dev uploads, or remote http(s) links. */
export async function loadMediaBufferFromUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Media URL is required.");
  }

  if (isDataMediaUrl(trimmed)) {
    return parseDataUrl(trimmed);
  }

  const localPath = localPublicPathFromUrl(trimmed);
  if (localPath) {
    try {
      await access(localPath);
      const buffer = await readFile(localPath);
      if (buffer.length === 0) {
        throw new Error("Uploaded asset file is empty.");
      }
      return { mime: mimeFromPath(localPath), buffer };
    } catch {
      throw new Error("Uploaded asset file was not found on disk.");
    }
  }

  if (!isPublicHttpUrl(trimmed)) {
    throw new Error("Media URL must be a public http(s) link or uploaded asset.");
  }

  const response = await fetch(trimmed);
  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status}).`);
  }

  const mime = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("Downloaded media file is empty.");
  }

  return { mime, buffer };
}

/** Ensure media is reachable over HTTPS for external AI providers. */
export async function ensurePublicMediaUrl(input: {
  url: string;
  userId: string;
  kind: StudioUploadKind;
}) {
  const url = input.url.trim();
  if (!url) {
    throw new Error("Media URL is required.");
  }

  if (isProviderReadyHttpsUrl(url)) {
    if (url.length > MAX_STORED_ASSET_URL_CHARS) {
      throw new Error("Media URL is too long to store.");
    }
    return url;
  }

  const { mime, buffer } = await loadMediaBufferFromUrl(url);
  return uploadMediaBuffer({
    buffer,
    mime,
    userId: input.userId,
    kind: input.kind,
    label: isDataMediaUrl(url) ? "generated" : "reference",
  });
}

/** Upload media to R2 in the background without blocking the response. Returns the original URL immediately. */
export function backgroundUploadMedia(input: {
  url: string;
  userId: string;
  kind: StudioUploadKind;
}) {
  if (!isR2Configured()) return;
  const url = input.url.trim();
  if (!url || isProviderReadyHttpsUrl(url)) return;

  (async () => {
    try {
      const { mime, buffer } = await loadMediaBufferFromUrl(url);
      await uploadMediaBuffer({
        buffer,
        mime,
        userId: input.userId,
        kind: input.kind,
        label: isDataMediaUrl(url) ? "generated" : "reference",
      });
    } catch (err) {
      console.warn("[backgroundUpload] failed:", err instanceof Error ? err.message : err);
    }
  })();
}

export async function ensurePublicMediaUrls(
  urls: string[] | undefined,
  userId: string,
  kind: StudioUploadKind,
) {
  if (!urls?.length) return [];
  const resolved: string[] = [];

  for (const url of urls) {
    if (!url?.trim()) continue;
    const publicUrl = await ensurePublicMediaUrl({ url, userId, kind });
    if (!resolved.includes(publicUrl)) {
      resolved.push(publicUrl);
    }
  }

  return resolved;
}
