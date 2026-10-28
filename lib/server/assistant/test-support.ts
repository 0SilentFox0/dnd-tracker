import { isLocalDevDatabaseUrl, localDevDatabaseName } from "@/lib/server/test-support/local-db";

export type ConstructorDatabaseTarget = { database: string; local: true; bothUrls: true };
export type ConstructorDatabaseEnv = { DATABASE_URL?: string; DIRECT_URL?: string };

export function assertConstructorDatabaseUrls(env: ConstructorDatabaseEnv): void {
  if (!isLocalDevDatabaseUrl(env.DATABASE_URL) || !isLocalDevDatabaseUrl(env.DIRECT_URL)) {
    throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");
  }
}

export function constructorDatabaseTarget(env: ConstructorDatabaseEnv): ConstructorDatabaseTarget {
  assertConstructorDatabaseUrls(env);

  return { database: localDevDatabaseName(env) as string, local: true, bothUrls: true };
}
