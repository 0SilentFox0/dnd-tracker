import { describe, expect, it } from "vitest";

import { isLocalDevDatabaseEnv, isLocalDevDatabaseUrl, singleConnectionDatabaseUrl } from "../local-db";

const local = (name: string) => `postgresql://postgres:postgres@localhost:54322/${name}`;

describe("local dev database guard", () => {
  it("accepts a loopback 54322 URL with any database name", () => {
    for (const name of ["constructor", "obojima", "prodcopy"]) expect(isLocalDevDatabaseUrl(local(name))).toBe(true);

    expect(isLocalDevDatabaseUrl("postgres://u:p@127.0.0.1:54322/x")).toBe(true);
  });

  it("rejects remote hosts, other ports, missing database and garbage", () => {
    for (const url of [
      "postgresql://u:p@db.example.supabase.co:5432/x",
      "postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
      "postgresql://u:p@localhost:5432/x",
      "postgresql://u:p@localhost:54322/",
      "mysql://u:p@localhost:54322/x",
      "not a url",
      "",
      undefined,
    ]) expect(isLocalDevDatabaseUrl(url)).toBe(false);
  });

  it("requires DIRECT_URL to be local when set", () => {
    expect(isLocalDevDatabaseEnv({ DATABASE_URL: local("a") })).toBe(true);
    expect(isLocalDevDatabaseEnv({ DATABASE_URL: local("a"), DIRECT_URL: local("a") })).toBe(true);
    expect(isLocalDevDatabaseEnv({ DATABASE_URL: local("a"), DIRECT_URL: "postgresql://u:p@db.example.supabase.co:5432/x" })).toBe(false);
    expect(isLocalDevDatabaseEnv({})).toBe(false);
  });

  it("adds connection_limit=1 locally and never returns a remote URL", () => {
    expect(singleConnectionDatabaseUrl("DATABASE_URL", { DATABASE_URL: local("a") })).toContain("connection_limit=1");
    expect(singleConnectionDatabaseUrl("DIRECT_URL", { DATABASE_URL: local("a") })).toContain("/a?connection_limit=1");

    const remote = singleConnectionDatabaseUrl("DATABASE_URL", { DATABASE_URL: "postgresql://u:p@db.example.supabase.co:5432/x" });

    expect(remote).not.toContain("supabase");
  });
});
