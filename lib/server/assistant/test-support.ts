export type ConstructorDatabaseTarget = { database: "constructor"; local: true; bothUrls: true };
export type ConstructorDatabaseEnv = { DATABASE_URL?: string; DIRECT_URL?: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalConstructorUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);

    return ["postgres:", "postgresql:"].includes(url.protocol)
      && LOCAL_HOSTS.has(url.hostname)
      && url.port === "54322"
      && url.pathname === "/constructor";
  } catch {
    return false;
  }
}

export function assertConstructorDatabaseUrls(env: ConstructorDatabaseEnv): void {
  if (!isLocalConstructorUrl(env.DATABASE_URL) || !isLocalConstructorUrl(env.DIRECT_URL)) {
    throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");
  }
}

export function constructorDatabaseTarget(env: ConstructorDatabaseEnv): ConstructorDatabaseTarget {
  assertConstructorDatabaseUrls(env);

  return { database: "constructor", local: true, bothUrls: true };
}
