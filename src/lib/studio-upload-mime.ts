import type { StudioUploadKind } from "@/lib/studio-upload-server";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

export function allowedMimeTypes(kind: StudioUploadKind) {
  return kind === "image" ? IMAGE_TYPES : kind === "audio" ? AUDIO_TYPES : VIDEO_TYPES;
}

export function allowedMimeTypeList(kind: StudioUploadKind) {
  return Array.from(allowedMimeTypes(kind));
}

export function resolveStudioFileMime(file: Pick<File, "name" | "type">, kind: StudioUploadKind) {
  const trimmed = file.type?.trim();
  if (trimmed && allowedMimeTypes(kind).has(trimmed)) {
    return trimmed;
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const inferred = ext ? EXTENSION_TO_MIME[ext] : undefined;

  if (inferred && allowedMimeTypes(kind).has(inferred)) {
    return inferred;
  }

  return trimmed || inferred || "";
}
