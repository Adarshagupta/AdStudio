import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGN_TTL_SECONDS = 600;

let cachedClient: S3Client | null = null;

function getR2Client() {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  return cachedClient;
}

function getBucket() {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) {
    throw new Error("Cloudflare R2 is not configured. Set R2_BUCKET.");
  }
  return bucket;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim() &&
      process.env.R2_PUBLIC_BASE_URL?.trim(),
  );
}

export function publicUrlForR2Key(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("Cloudflare R2 is not configured. Set R2_PUBLIC_BASE_URL.");
  }
  return `${base}/${key.replace(/^\//, "")}`;
}

export function isVercelDeployment() {
  return Boolean(process.env.VERCEL);
}

/** Production (Vercel) uses R2; local dev uses disk unless STUDIO_STORAGE=r2. */
export function studioUploadUsesR2() {
  if (isVercelDeployment()) {
    return true;
  }
  return isR2Configured() && process.env.STUDIO_STORAGE?.trim() === "r2";
}

/** Browser PUT to presigned URLs needs R2 bucket CORS. Default: upload via our API (no CORS). */
export function studioUploadMethod(): "r2-presign" | "form" | "unconfigured" {
  if (!studioUploadUsesR2()) {
    return "form";
  }
  if (!isR2Configured()) {
    return "unconfigured";
  }
  if (process.env.STUDIO_UPLOAD_DIRECT?.trim() === "1") {
    return "r2-presign";
  }
  return "form";
}

export async function putR2Object(key: string, body: Buffer, contentType: string) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return publicUrlForR2Key(key);
}

export async function createR2PresignedPut(input: {
  key: string;
  contentType: string;
  contentLength?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: input.key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });

  return {
    key: input.key,
    uploadUrl,
    publicUrl: publicUrlForR2Key(input.key),
    contentType: input.contentType,
    expiresIn: PRESIGN_TTL_SECONDS,
  };
}

export async function createPresignedUploadUrl(key: string, contentType: string) {
  const presigned = await createR2PresignedPut({ key, contentType });
  return {
    key: presigned.key,
    uploadUrl: presigned.uploadUrl,
    publicUrl: presigned.publicUrl,
  };
}
