const NEON_TIMEOUT_PARAMS = {
  connect_timeout: "30",
  pool_timeout: "30",
  connection_limit: "10",
  sslmode: "require",
};

export function isNeonDatabaseUrl(url) {
  try {
    return new URL(url).hostname.includes(".neon.tech");
  } catch {
    return false;
  }
}

export function withNeonConnectionTimeouts(url) {
  if (!url || !isNeonDatabaseUrl(url)) {
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

export function toDirectDatabaseUrl(pooledUrl) {
  if (!pooledUrl) {
    return pooledUrl;
  }

  const direct = pooledUrl.includes("-pooler.")
    ? pooledUrl.replace("-pooler.", ".")
    : pooledUrl;

  return withNeonConnectionTimeouts(direct);
}
