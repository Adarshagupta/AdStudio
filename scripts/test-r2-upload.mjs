#!/usr/bin/env node
/**
 * Smoke-test R2 credentials from .env (no app server required).
 * Usage: node scripts/test-r2-upload.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const root = process.cwd();
const envPath = path.join(root, ".env");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    let v = trimmed.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[trimmed.slice(0, i)] = v;
  }
  return out;
}

const env = { ...loadEnv(envPath), ...loadEnv(path.join(root, ".env.local")) };
const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

const missing = required.filter((k) => !env[k]?.trim());
if (missing.length) {
  console.error("Missing in .env:", missing.join(", "));
  process.exit(1);
}

const publicBase = env.R2_PUBLIC_BASE_URL.trim().replace(/\/$/, "");
if (publicBase.includes("r2.cloudflarestorage.com")) {
  console.error(
    "R2_PUBLIC_BASE_URL looks like the S3 API host, not a public URL.\n" +
      "Use the pub-xxxx.r2.dev URL from bucket → Settings → Public access.",
  );
  process.exit(1);
}

const accountId = env.R2_ACCOUNT_ID.trim();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

const key = `studio/_smoke-test/${Date.now()}.txt`;
const body = Buffer.from(`r2 smoke test ${new Date().toISOString()}\n`, "utf8");

console.log("Uploading to R2…", { bucket: env.R2_BUCKET, key });

await client.send(
  new PutObjectCommand({
    Bucket: env.R2_BUCKET.trim(),
    Key: key,
    Body: body,
    ContentType: "text/plain",
  }),
);

const publicUrl = `${publicBase}/${key}`;
console.log("Upload OK.");
console.log("Public URL:", publicUrl);

const res = await fetch(publicUrl);
console.log("Public GET:", res.status, res.statusText);
if (!res.ok) {
  console.error(
    "Object uploaded but public URL is not readable. Enable public access on the bucket or fix R2_PUBLIC_BASE_URL.",
  );
  process.exit(1);
}

console.log("R2 configuration looks good.");
