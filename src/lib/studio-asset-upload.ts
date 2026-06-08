import { readJsonResponse, responseErrorMessage } from "@/lib/http/json";
import { resolveStudioFileMime } from "@/lib/studio-upload-mime";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import { registerUserAssetQuiet } from "@/lib/user-assets-client";

export type StudioAssetUploadKind = StudioUploadKind;

type UploadConfig = { method: "r2-presign" | "form" | "unconfigured" };

let uploadConfigCache: UploadConfig | null = null;

async function getUploadConfig() {
  if (uploadConfigCache) return uploadConfigCache;

  const response = await fetch("/api/studio/upload/config", { cache: "no-store" });
  const data = await readJsonResponse<UploadConfig>(response);
  uploadConfigCache = data;
  return data;
}

async function uploadViaR2Presign(file: File, kind: StudioAssetUploadKind) {
  const contentType = resolveStudioFileMime(file, kind);
  if (!contentType) {
    throw new Error("Unsupported file type.");
  }

  const presignResponse = await fetch("/api/studio/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      fileName: file.name,
      contentType,
      size: file.size,
    }),
  });

  const presign = await readJsonResponse<{
    uploadUrl?: string;
    publicUrl?: string;
    contentType?: string;
    error?: string;
  }>(presignResponse);

  if (!presignResponse.ok || !presign.uploadUrl || !presign.publicUrl) {
    throw new Error(responseErrorMessage(presignResponse, presign, "Could not start upload."));
  }

  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presign.contentType ?? contentType },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`Upload to storage failed (${putResponse.status}).`);
  }

  registerUserAssetQuiet({
    url: presign.publicUrl,
    kind,
    source: "uploaded",
    name: file.name,
    mimeType: presign.contentType ?? contentType,
    byteSize: file.size,
  });

  return presign.publicUrl;
}

async function uploadViaForm(file: File, kind: StudioAssetUploadKind) {
  const mimeType = resolveStudioFileMime(file, kind) ?? undefined;
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", file);

  const response = await fetch("/api/studio/upload", {
    method: "POST",
    body: formData,
  });

  const data = await readJsonResponse<{
    url?: string;
    asset?: { id: string; url?: string };
    error?: string;
  }>(response);
  if (!response.ok || !data.url) {
    throw new Error(responseErrorMessage(response, data, "Upload failed."));
  }

  const publicUrl = data.asset?.url ?? data.url;

  if (!data.asset) {
    registerUserAssetQuiet({
      url: publicUrl,
      kind,
      source: "uploaded",
      name: file.name,
      mimeType,
      byteSize: file.size,
    });
  }

  return publicUrl;
}

export async function uploadStudioAsset(file: File, kind: StudioAssetUploadKind) {
  const mime = resolveStudioFileMime(file, kind);
  if (!mime) {
    if (kind === "image") throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
    if (kind === "video") throw new Error("Use an MP4, WebM, or MOV video.");
    throw new Error("Use a supported audio file.");
  }

  const config = await getUploadConfig();

  if (config.method === "unconfigured") {
    throw new Error(
      "File storage is not configured. Add Cloudflare R2 credentials to the deployment environment.",
    );
  }

  if (config.method === "r2-presign") {
    return uploadViaR2Presign(file, kind);
  }

  return uploadViaForm(file, kind);
}

export function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}
