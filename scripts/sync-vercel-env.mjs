#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { toDirectDatabaseUrl, withNeonConnectionTimeouts } from "./with-neon-timeouts.mjs";

const root = process.cwd();
const envPaths = [path.join(root, ".env"), path.join(root, ".env.local")].filter((file) =>
  fs.existsSync(file),
);

if (envPaths.length === 0) {
  console.error("Missing .env — add DATABASE_URL before deploying.");
  process.exit(1);
}

function parseEnv(content) {
  const values = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

const vercelBin = path.join(root, "node_modules", ".bin", "vercel");

function upsertVercelEnv(name, value, environment = "production") {
  try {
    execSync(`"${vercelBin}" env rm ${name} ${environment} --yes`, {
      cwd: root,
      stdio: "pipe",
    });
  } catch {
    // Variable may not exist yet.
  }

  execSync(`"${vercelBin}" env add ${name} ${environment}`, {
    cwd: root,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

const env = envPaths.reduce((merged, file) => {
  Object.assign(merged, parseEnv(fs.readFileSync(file, "utf8")));
  return merged;
}, {});
const databaseUrl = env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error(".env is missing DATABASE_URL.");
  process.exit(1);
}

const pooledUrl = withNeonConnectionTimeouts(databaseUrl);
const directUrl = env.DIRECT_DATABASE_URL?.trim()
  ? withNeonConnectionTimeouts(env.DIRECT_DATABASE_URL.trim())
  : toDirectDatabaseUrl(pooledUrl);

console.log("Syncing DATABASE_URL and DIRECT_DATABASE_URL to Vercel production…");
upsertVercelEnv("DATABASE_URL", pooledUrl);
upsertVercelEnv("DIRECT_DATABASE_URL", directUrl);

const r2Keys = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

let r2Synced = 0;
for (const name of r2Keys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  r2Synced += 1;
}

if (r2Synced === 0) {
  console.warn(
    "No R2_* variables found in .env / .env.local — production uploads need Cloudflare R2 credentials.",
  );
} else if (r2Synced < r2Keys.length) {
  console.warn(`Only ${r2Synced}/${r2Keys.length} R2 variables were synced. Set all R2_* keys for uploads.`);
}

const kvKeys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];

let kvSynced = 0;
for (const name of kvKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  kvSynced += 1;
}

if (kvSynced === 0) {
  console.warn(
    "No Vercel KV / Upstash REST variables found — add Upstash Redis from Vercel Marketplace for navigation cache.",
  );
}

for (const name of ["REDIS_URL", "KV_URL"]) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
}

if (!env.REDIS_URL?.trim() && !env.KV_URL?.trim()) {
  console.warn(
    "REDIS_URL / KV_URL not set — optional for BullMQ generation queue and multi-instance SSE fan-out.",
  );
}

const realtimeKeys = [
  "NEXT_PUBLIC_STUDIO_REALTIME_URL",
  "STUDIO_REALTIME_JWT_SECRET",
];

let realtimeSynced = 0;
for (const name of realtimeKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  realtimeSynced += 1;
}

if (realtimeSynced === 0) {
  console.warn(
    "No Studio realtime variables found — run `bun run deploy:realtime` or set NEXT_PUBLIC_STUDIO_REALTIME_URL and STUDIO_REALTIME_JWT_SECRET.",
  );
} else if (realtimeSynced < 2) {
  console.warn(
    "Studio realtime env incomplete — set both NEXT_PUBLIC_STUDIO_REALTIME_URL and STUDIO_REALTIME_JWT_SECRET.",
  );
}

const cloudflareKeys = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CF_IMAGE_MODEL",
  "CF_AUDIO_MODEL",
];

let cloudflareSynced = 0;
for (const name of cloudflareKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  cloudflareSynced += 1;
}

if (cloudflareSynced === 0) {
  console.warn(
    "No CLOUDFLARE_* variables found — image/audio fallback needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
  );
}

const fireworksKeys = ["FIREWORKS_API_KEY", "FIREWORKS_TEXT_MODEL"];

let fireworksSynced = 0;
for (const name of fireworksKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  fireworksSynced += 1;
}

if (fireworksSynced === 0) {
  console.warn("No FIREWORKS_* variables found — text generation needs FIREWORKS_API_KEY in .env.");
}

const ltxKeys = ["LTX_API_BASE", "LTX_API_KEY", "LTX_API_KEYS", "LTX_VIDEO_MODEL"];

let ltxSynced = 0;
for (const name of ltxKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  ltxSynced += 1;
}

const fluxKeys = ["FLUX_API_BASE", "FLUX_API_KEY"];

let fluxSynced = 0;
for (const name of fluxKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  fluxSynced += 1;
}

if (fluxSynced === 0) {
  console.warn("No FLUX_* variables found — self-hosted Flux needs FLUX_API_BASE and FLUX_API_KEY in .env.");
} else if (fluxSynced < fluxKeys.length) {
  console.warn(`Only ${fluxSynced}/${fluxKeys.length} FLUX variables were synced.`);
}

if (ltxSynced === 0) {
  console.warn("No LTX_* variables found — video generation needs LTX_API_KEY in .env.");
} else if (ltxSynced < ltxKeys.length) {
  console.warn(`Only ${ltxSynced}/${ltxKeys.length} LTX variables were synced.`);
}

const openaiKeys = ["OPENAI_API_KEY"];

let openaiSynced = 0;
for (const name of openaiKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  openaiSynced += 1;
}

if (openaiSynced === 0) {
  console.warn(
    "No OPENAI_API_KEY found — OpenAI image/video models stay in the UI but need a key to run.",
  );
}

const stripeKeys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

let stripeSynced = 0;
for (const name of stripeKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  stripeSynced += 1;
}

if (stripeSynced === 0) {
  console.warn(
    "No STRIPE_* variables found — template marketplace checkout needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
  );
}

const productionAppUrl = env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.litemoov.com";
console.log("Syncing APP_URL and NEXT_PUBLIC_APP_URL to Vercel production…");
upsertVercelEnv("APP_URL", productionAppUrl);
upsertVercelEnv("NEXT_PUBLIC_APP_URL", productionAppUrl);

const googleKeys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_STATE_SECRET"];

let googleSynced = 0;
for (const name of googleKeys) {
  const value = env[name]?.trim();
  if (!value) continue;
  console.log(`Syncing ${name} to Vercel production…`);
  upsertVercelEnv(name, value);
  googleSynced += 1;
}

if (googleSynced === 0) {
  console.warn("No GOOGLE_* variables found — Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
} else if (googleSynced < 2) {
  console.warn("Google OAuth env incomplete — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

console.log("Vercel env vars updated.");
