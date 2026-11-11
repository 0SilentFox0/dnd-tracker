import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { listPackKeys, readPack, TEMPLATES_DIR } from "../lib/pack";
import { validatePack } from "../lib/validate";

import { mergeRules, RulesetSchema } from "@/lib/utils/rules/schema";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const rulesOf = (key: string) => readPack(key).rules;

const roundTrip = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("rules.json of the packs", () => {
  it.each(listPackKeys())("%s: rules.json is a complete Ruleset of the pack system", (key) => {
    const pack = readPack(key);

    const parsed = RulesetSchema.parse(pack.rules);

    expect(parsed.system.key).toBe(pack.manifest.system);
    expect(roundTrip(parsed)).toEqual(pack.rules);
  });

  it("srd-5.2-empty carries the same rules as srd-5.2", () => {
    expect(rulesOf("srd-5.2-empty")).toEqual(rulesOf("srd-5.2"));
  });

  it("grim-d100-empty carries the code default WFRP_RULES", () => {
    expect(rulesOf("grim-d100-empty")).toEqual(roundTrip(WFRP_RULES));
  });

  it("grim-d100 equals the old patch merged over WFRP_RULES", () => {
    const patch = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "grim-rules-patch.json"), "utf8"));

    const merged = mergeRules(WFRP_RULES, patch);

    if (!merged.ok) throw new Error("old patch invalid");

    expect(rulesOf("grim-d100")).toEqual(roundTrip(merged.rules));
  });

  it("the shells have no kinds, only the English locale and no errors", () => {
    for (const key of ["srd-5.2-empty", "grim-d100-empty"]) {
      const pack = readPack(key);

      expect(pack.manifest.kinds).toEqual([]);
      expect(pack.manifest.locales).toEqual(["en"]);
      expect(validatePack(pack).filter((issue) => issue.level === "error")).toEqual([]);
    }
  });

  it("readPack throws without rules.json unless lenient", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-missing-"));

    fs.cpSync(path.join(TEMPLATES_DIR, "srd-5.2-empty"), path.join(dir, "srd-5.2-empty"), { recursive: true });
    fs.rmSync(path.join(dir, "srd-5.2-empty", "rules.json"));

    expect(() => readPack("srd-5.2-empty", dir)).toThrow(/no rules file/);
    expect(validatePack(readPack("srd-5.2-empty", dir, { lenient: true })).some((issue) => issue.level === "error")).toBe(true);
  });
});
