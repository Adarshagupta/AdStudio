/** Neon computes sleep after inactivity; Prisma defaults to a 5s connect timeout (P1001). */
const NEON_TIMEOUT_PARAMS = {
  connect_timeout: "30",
  pool_timeout: "30",
  connection_limit: "10",
  sslmode: "require",
} as const;

export function isNeonDatabaseUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.includes(".neon.tech");
  } catch {
    return false;
  }
}

/** Ensures Neon-friendly timeouts are present on the connection string. */
export function withNeonConnectionTimeouts(url: string) {
  if (!isNeonDatabaseUrl(url)) {
    return url;
  }

  const parsed = new URL(url);

  for (const [key, value] of Object.entries(NEON_TIMEOUT_PARAMS)) {
    if (!parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
  }

  if (parsed.hostname.includes("-pooler.") && !parsed.searchParams.has("pgbouncer")) {
    parsed.searchParams.set("pgbouncer", "true");
  }

  return parsed.toString();
}

/** Resolves DB URL from common env names (local .env, Vercel Postgres, Neon). */
export function pickDatabaseUrlFromEnv() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    null
  );
}

export function resolveDatabaseUrl() {
  const url = pickDatabaseUrlFromEnv();

  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Add DATABASE_URL to .env (copy from .env.example) or link a Postgres database on Vercel.",
    );
  }

  return withNeonConnectionTimeouts(url);
}

export function resolveDirectDatabaseUrl() {
  const direct = process.env.DIRECT_DATABASE_URL?.trim();
  if (direct) {
    return withNeonConnectionTimeouts(direct);
  }

  const pooled = pickDatabaseUrlFromEnv();
  if (!pooled) {
    throw new Error(
      "DATABASE_URL is not configured. Add DATABASE_URL to .env (copy from .env.example) or link a Postgres database on Vercel.",
    );
  }

  // Prisma Migrate needs a non-pooler host; fall back to de-pooling the pooled URL.
  if (pooled.includes("-pooler.")) {
    return withNeonConnectionTimeouts(pooled.replace("-pooler.", "."));
  }

  return withNeonConnectionTimeouts(pooled);
}

export function isDatabaseConfigured() {
  return Boolean(pickDatabaseUrlFromEnv());
}
