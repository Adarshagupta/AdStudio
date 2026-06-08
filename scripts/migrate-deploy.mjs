#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { toDirectDatabaseUrl, withNeonConnectionTimeouts } from "./with-neon-timeouts.mjs";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return "";
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("DATABASE_URL=")) continue;

    let value = trimmed.slice("DATABASE_URL=".length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value;
  }

  return process.env.DATABASE_URL?.trim() ?? "";
}

const pooled = withNeonConnectionTimeouts(loadDatabaseUrl());

if (!pooled) {
  console.warn("[migrate-deploy] DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

const direct = process.env.DIRECT_DATABASE_URL?.trim()
  ? withNeonConnectionTimeouts(process.env.DIRECT_DATABASE_URL.trim())
  : toDirectDatabaseUrl(pooled);
const attempts = 3;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`[migrate-deploy] attempt ${attempt}/${attempts}`);

  const result = spawnSync("bunx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: direct,
    },
  });

  if (result.status === 0) {
    console.log("[migrate-deploy] migrations applied.");
    process.exit(0);
  }

  if (attempt < attempts) {
    console.warn("[migrate-deploy] retrying in 8s…");
    spawnSync("sleep", ["8"]);
  }
}

console.warn(
  "[migrate-deploy] migrations skipped (database unreachable or quota). Deploy continues; app will auto-repair schema on first request.",
);
process.exit(0);
