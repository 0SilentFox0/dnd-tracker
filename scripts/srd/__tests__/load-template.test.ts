import { describe, expect, it, vi } from "vitest";

import { formatImportSummary, hasRowErrors, importSrdData, parseSrdSeedArgs, type RunImport, staleSpellColumns } from "../lib/load-template";
import { SRD_KINDS, type SrdData } from "../lib/types";

import type { ImportReport } from "@/types/content-import";

const report = (error = 0): ImportReport => ({ dryRun: false, results: error ? [{ row: 2, name: "Fireball", status: "error", issues: [{ level: "error", message: "bad" }] }] : [], counts: { created: 0, updated: 3, skipped: 0, error } });

describe("canonical SRD seed arguments", () => {
  it.each([[], ["--locale", "en"]])("seeds English for %j", (...args) => {
    expect(parseSrdSeedArgs(args)).toEqual({ locale: "en", owner: undefined, allowRemote: false });
  });

  it("retains owner and explicit remote opt-in", () => {
    expect(parseSrdSeedArgs(["--owner", "owner", "--allow-remote"])).toEqual({ locale: "en", owner: "owner", allowRemote: true });
  });

  it.each([["uk"], ["pl"], [], ["--owner", "owner"]])("rejects --locale %j before a store can be used", (...args) => {
    expect(() => parseSrdSeedArgs(["--locale", ...args])).toThrow(/English|англійськ/i);
  });
});

describe("importSrdData", () => {
  it("imports kinds in order with slugs stripped; errors are detected and listed", async () => {
    const data = Object.fromEntries(SRD_KINDS.map((k) => [k, [{ slug: `srd-2024_${k}`, name: k }]])) as unknown as SrdData;

    const run = vi.fn<RunImport>(async (kind) => report(kind === "spells" ? 1 : 0));

    const results = await importSrdData(data, run);

    expect(run.mock.calls.map((c) => c[0])).toEqual([...SRD_KINDS]);
    expect(run.mock.calls[0][1]).toEqual([{ name: "spell-groups" }]);
    expect(hasRowErrors(results)).toBe(true);
    expect(formatImportSummary(results)).toContain("spells: created 0, updated 3, skipped 0, error 1");
    expect(formatImportSummary(results)).toContain("  #2 Fireball: bad");
  });
});

describe("staleSpellColumns", () => {
  it("lists, per optional column, the spells that no longer carry it", () => {
    const spells = [
      { name: "Fireball", dieSides: 6, upcastDice: 1 },
      { name: "Freedom of Movement" },
    ] as unknown as Parameters<typeof staleSpellColumns>[0];

    expect(staleSpellColumns(spells)).toEqual([
      { column: "dieSides", names: ["Freedom of Movement"] },
      { column: "upcastDice", names: ["Freedom of Movement"] },
      { column: "upcastTargets", names: ["Fireball", "Freedom of Movement"] },
      { column: "addAbilityMod", names: ["Fireball", "Freedom of Movement"] },
      { column: "fixedDice", names: ["Fireball", "Freedom of Movement"] },
      { column: "damageBonus", names: ["Fireball", "Freedom of Movement"] },
    ]);
  });
});
