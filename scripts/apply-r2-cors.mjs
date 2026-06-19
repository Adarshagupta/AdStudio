#!/usr/bin/env node
/**
 * Apply scripts/r2-cors-policy.json to the R2 bucket in .env
 * Usage: node scripts/apply-r2-cors.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const root = process.cwd();

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

const env = { ...loadEnv(path.join(root, ".env")), ...loadEnv(path.join(root, ".env.local")) };
const accountId = env.R2_ACCOUNT_ID?.trim();
const bucket = env.R2_BUCKET?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 credentials in .env");
  process.exit(1);
}

const policyPath = path.join(root, "scripts/r2-cors-policy.json");
const rules = JSON.parse(fs.readFileSync(policyPath, "utf8"));

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

console.log(`Applying R2 CORS to bucket "${bucket}"…`);
console.log(JSON.stringify(rules, null, 2));

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: rules },
  }),
);

console.log("R2 CORS updated.");
