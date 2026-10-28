import { describe, expect, it, vi } from "vitest";

import { ensureSrdTemplate, formatImportSummary, hasRowErrors, importSrdData, type RunImport, staleSpellColumns, type TemplateStore } from "../lib/load-template";
import { SRD_RULES } from "../lib/rules-preset";
import { SRD_KINDS, type SrdData } from "../lib/types";

import type { ImportReport } from "@/types/content-import";

const store = (over: Partial<TemplateStore> = {}): TemplateStore => ({
  findTemplate: vi.fn(async () => null),
  findOfficialOwner: vi.fn(async () => null),
  create: vi.fn(async ({ userId }: { userId: string }) => ({ id: "t-new", dmUserId: userId })),
  update: vi.fn(async () => undefined),
  ...over,
});

const opts = { rules: SRD_RULES, credits: "CREDITS" };

const report = (error = 0): ImportReport => ({ dryRun: false, results: error ? [{ row: 2, name: "Fireball", status: "error", issues: [{ level: "error", message: "bad" }] }] : [], counts: { created: 0, updated: 3, skipped: 0, error } });

describe("ensureSrdTemplate", () => {
  it("existing template: rules, credits and description are rewritten, nothing created", async () => {
    const s = store({ findTemplate: vi.fn(async () => ({ id: "t1", dmUserId: "u1" })) });

    expect(await ensureSrdTemplate(s, opts)).toEqual({ id: "t1", dmUserId: "u1", created: false });
    expect(s.update).toHaveBeenCalledWith("t1", expect.objectContaining({ rules: SRD_RULES, credits: "CREDITS" }));
    expect(s.create).not.toHaveBeenCalled();
  });

  it("new template: owner from --owner, else the owner of an official template, else an error", async () => {
    const withOwner = store();

    expect(await ensureSrdTemplate(withOwner, { ...opts, owner: "me" })).toEqual({ id: "t-new", dmUserId: "me", created: true });
    expect(withOwner.create).toHaveBeenCalledWith({ userId: "me", rules: SRD_RULES, credits: "CREDITS" });

    expect((await ensureSrdTemplate(store({ findOfficialOwner: vi.fn(async () => "homm-owner") }), opts)).dmUserId).toBe("homm-owner");
    await expect(ensureSrdTemplate(store(), opts)).rejects.toThrow(/--owner/);
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
