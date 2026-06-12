#!/usr/bin/env node
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workerDir = path.join(root, "workers", "studio-realtime");
const envPaths = [path.join(root, ".env"), path.join(root, ".env.local")].filter((file) =>
  fs.existsSync(file),
);

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

function upsertEnvValue(key, value) {
  const target = envPaths[envPaths.length - 1] ?? path.join(root, ".env.local");
  let content = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";

  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}="${value}"`;

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }

  fs.writeFileSync(target, content);
}

function upsertVercelEnv(name, value, environment = "production") {
  try {
    execSync(`bunx vercel env rm ${name} ${environment} --yes`, {
      cwd: root,
      stdio: "pipe",
    });
  } catch {
    // Variable may not exist yet.
  }

  execSync(`bunx vercel env add ${name} ${environment}`, {
    cwd: root,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

const env = envPaths.reduce((merged, file) => {
  Object.assign(merged, parseEnv(fs.readFileSync(file, "utf8")));
  return merged;
}, {});

let jwtSecret = env.STUDIO_REALTIME_JWT_SECRET?.trim();
if (!jwtSecret) {
  jwtSecret = crypto.randomBytes(32).toString("base64url");
  upsertEnvValue("STUDIO_REALTIME_JWT_SECRET", jwtSecret);
  console.log("Generated STUDIO_REALTIME_JWT_SECRET in local env.");
}

const cfToken = env.CLOUDFLARE_API_TOKEN?.trim();
const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();

const wranglerEnv = {
  ...process.env,
  ...(cfAccountId ? { CLOUDFLARE_ACCOUNT_ID: cfAccountId } : {}),
};

if (cfToken && process.env.WRANGLER_USE_API_TOKEN === "1") {
  wranglerEnv.CLOUDFLARE_API_TOKEN = cfToken;
} else {
  delete wranglerEnv.CLOUDFLARE_API_TOKEN;
}

const allowedOrigins = new Set([
  "https://ugc-ad-platform.vercel.app",
  "https://studio.sylicaai.com",
  "http://localhost:3000",
]);
const appUrl = env.APP_URL?.trim();
if (appUrl) {
  allowedOrigins.add(appUrl.replace(/\/$/, ""));
}

const wranglerConfigPath = path.join(workerDir, "wrangler.jsonc");
const wranglerConfig = fs.readFileSync(wranglerConfigPath, "utf8");
const originsLine = `    "ALLOWED_ORIGINS": "${Array.from(allowedOrigins).join(",")}"`;
const nextWranglerConfig = wranglerConfig.replace(
  /"ALLOWED_ORIGINS": "[^"]*"/,
  originsLine.trim(),
);
fs.writeFileSync(wranglerConfigPath, nextWranglerConfig);

console.log("Installing worker dependencies…");
execSync("bun install", { cwd: workerDir, stdio: "inherit", env: wranglerEnv });

console.log("Deploying Studio realtime worker…");
let deployOutput = "";
try {
  deployOutput = execSync("bunx wrangler deploy", {
    cwd: workerDir,
    stdio: ["pipe", "pipe", "inherit"],
    env: wranglerEnv,
  }).toString();
} catch (error) {
  console.error(
    "Cloudflare deploy failed. Run `cd workers/studio-realtime && bunx wrangler login`, then retry `bun run deploy:realtime`.",
  );
  console.error(
    "If using an API token, it needs Workers Scripts Edit + Durable Objects Edit permissions.",
  );
  throw error;
}

console.log("Setting Cloudflare worker secret…");
try {
  execSync("bunx wrangler secret put STUDIO_REALTIME_JWT_SECRET", {
    cwd: workerDir,
    input: jwtSecret,
    stdio: ["pipe", "inherit", "inherit"],
    env: wranglerEnv,
  });
} catch (error) {
  console.warn(
    "Could not set worker secret automatically. Run this manually from workers/studio-realtime:",
  );
  console.warn("  bunx wrangler secret put STUDIO_REALTIME_JWT_SECRET");
}

const deployedUrl =
  deployOutput.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i)?.[0] ??
  "https://ugc-studio-realtime.prazwol.workers.dev";

console.log(`Worker URL: ${deployedUrl}`);
upsertEnvValue("NEXT_PUBLIC_STUDIO_REALTIME_URL", deployedUrl);

console.log("Syncing realtime env vars to Vercel production…");
upsertVercelEnv("NEXT_PUBLIC_STUDIO_REALTIME_URL", deployedUrl);
upsertVercelEnv("STUDIO_REALTIME_JWT_SECRET", jwtSecret);

console.log("Studio realtime deployed and env synced.");
