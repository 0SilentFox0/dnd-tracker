const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const LOCAL_PORT = "54322";

const SKIPPED_URL = "postgresql://skipped:skipped@127.0.0.1:1/skipped";

type Env = Record<string, string | undefined>;

export function isLocalDevDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);

    return ["postgres:", "postgresql:"].includes(url.protocol)
      && LOCAL_HOSTS.has(url.hostname)
      && url.port === LOCAL_PORT
      && url.pathname.length > 1;
  } catch {
    return false;
  }
}

/** DATABASE_URL must be the local dev Postgres (any database name); DIRECT_URL, when set, too. */
export function isLocalDevDatabaseEnv(env: Env = process.env): boolean {
  return isLocalDevDatabaseUrl(env.DATABASE_URL) && (env.DIRECT_URL === undefined || isLocalDevDatabaseUrl(env.DIRECT_URL));
}

export function localDevDatabaseName(env: Env = process.env): string | null {
  return isLocalDevDatabaseEnv(env) ? new URL(env.DATABASE_URL as string).pathname.slice(1) : null;
}

/** Local URL with connection_limit=1, or an unreachable placeholder when the env is not local (the test file is skipped). */
export function singleConnectionDatabaseUrl(name: "DATABASE_URL" | "DIRECT_URL", env: Env = process.env): string {
  if (!isLocalDevDatabaseEnv(env)) return SKIPPED_URL;

  const url = new URL(env[name] ?? (env.DATABASE_URL as string));

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}
