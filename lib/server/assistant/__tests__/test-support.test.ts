import { describe, expect, it } from "vitest";

import { assertConstructorDatabaseUrls, constructorDatabaseTarget } from "@/lib/server/assistant/test-support";

const local = "postgresql://local:secret@127.0.0.1:54322/constructor?connection_limit=1";

describe("constructor assistant integration target guard", () => {
  it("accepts only both local constructor URLs and reports no credentials", () => {
    expect(assertConstructorDatabaseUrls({ DATABASE_URL: local, DIRECT_URL: local })).toBeUndefined();
    expect(constructorDatabaseTarget({ DATABASE_URL: local, DIRECT_URL: local })).toEqual({ database: "constructor", local: true, bothUrls: true });
  });

  const rejected = [
    [{ DATABASE_URL: local }, "missing direct URL"],
    [{ DATABASE_URL: local, DIRECT_URL: "postgresql://user:secret@example.com:54322/constructor" }, "remote direct URL"],
    [{ DATABASE_URL: local, DIRECT_URL: "postgresql://user:secret@localhost:54322/prodcopy" }, "wrong database"],
    [{ DATABASE_URL: "postgresql://user:secret@localhost:54321/constructor", DIRECT_URL: local }, "wrong port"],
  ] as const;

  for (const [env, label] of rejected) it(`rejects ${label} without exposing URL contents`, () => {
    try {
      assertConstructorDatabaseUrls(env);
      throw new Error("expected safe rejection");
    } catch (error) {
      expect(String(error)).toContain("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");
      expect(String(error)).not.toContain("secret");
      expect(String(error)).not.toContain("example.com");
    }
  });
});
