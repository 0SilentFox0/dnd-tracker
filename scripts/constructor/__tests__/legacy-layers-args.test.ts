import { describe, expect, it } from "vitest";

import { formatReport, parseArgs, UsageError } from "../legacy-layers";

describe("parseArgs", () => {
  it("defaults to dry-run for one campaign", () => {
    expect(parseArgs(["--campaign", "c1"])).toEqual({ mode: "dry-run", campaigns: ["c1"], all: false, allowRemote: false });
  });

  it("ignores the pnpm `--` separator", () => {
    expect(parseArgs(["--", "--all"])).toMatchObject({ mode: "dry-run", all: true });
  });

  it("accepts --all with dry-run, --json and --allow-remote", () => {
    expect(parseArgs(["--all", "--dry-run", "--json", "out.json", "--allow-remote"])).toMatchObject({ mode: "dry-run", all: true, json: "out.json", allowRemote: true });
  });

  it("apply needs exactly one campaign", () => {
    expect(parseArgs(["--apply", "--campaign", "c1"])).toMatchObject({ mode: "apply", campaigns: ["c1"] });
    expect(() => parseArgs(["--apply"])).toThrow(UsageError);
    expect(() => parseArgs(["--apply", "--campaign", "a", "--campaign", "b"])).toThrow(UsageError);
  });

  it("rejects --all with --apply", () => {
    expect(() => parseArgs(["--apply", "--all"])).toThrow(UsageError);
    expect(() => parseArgs(["--apply", "--all", "--campaign", "c1"])).toThrow(UsageError);
  });

  it("verify and undo need a path and nothing else", () => {
    expect(parseArgs(["--verify", "p.json.gz"])).toMatchObject({ mode: "verify", preImage: "p.json.gz" });
    expect(parseArgs(["--undo", "p.json.gz"])).toMatchObject({ mode: "undo", preImage: "p.json.gz" });
    expect(() => parseArgs(["--verify"])).toThrow(UsageError);
    expect(() => parseArgs(["--undo", "--allow-remote"])).toThrow(UsageError);
    expect(() => parseArgs(["--undo", "p", "--campaign", "c1"])).toThrow(UsageError);
  });

  it("rejects conflicting modes, unknown flags and empty dry-run", () => {
    expect(() => parseArgs(["--apply", "--dry-run", "--campaign", "c1"])).toThrow(UsageError);
    expect(() => parseArgs(["--verify", "p", "--undo", "p"])).toThrow(UsageError);
    expect(() => parseArgs(["--bogus"])).toThrow(UsageError);
    expect(() => parseArgs([])).toThrow(UsageError);
    expect(() => parseArgs(["--campaign"])).toThrow(UsageError);
  });
});

describe("formatReport", () => {
  it("prints header, warnings and blockers", () => {
    const text = formatReport({ campaignId: "c1", name: "Camp", sourceId: "s1", version: 3, status: "eligible", tables: {}, referrers: [], blockers: [], warnings: [{ code: "DROPPED_NOTIFICATIONS", count: 2 }, { code: "SYNC_STATE_FALLBACK" }] });

    expect(text).toContain("Camp c1 source=s1 v=3 status=eligible");
    expect(text).toContain("blockers: none");
    expect(text).toContain("DROPPED_NOTIFICATIONS x2, SYNC_STATE_FALLBACK");
  });
});
