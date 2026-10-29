import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { conditionMarkers, customConditionKey, deriveCustomConditions } from "../adapters/custom-conditions";
import { type ImportRepository, previewImport } from "../service";

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const secret = "a-long-test-only-signing-key-for-import-preview";

const dazed = { name: "Dazed", source: "Test", entries: ["A dazed creature can't attack, cast a spell that affects an enemy, or deal damage to another creature."] };

const whispered = { name: "Whispered", source: "Test", entries: ["A whispered creature can't hold a secret."] };

const spell = { name: "Daze Person", source: "Test", level: 1, school: "E", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }], savingThrow: ["wisdom"], entries: ["You daze a humanoid you can see within range. The target must make a Wisdom saving throw. If it fails the save, it is {@condition dazed|Test} by you until the spell ends. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success."], entriesHigherLevel: [{ type: "entries", name: "At Higher Levels", entries: ["When you cast this spell using a spell slot of 2nd level or higher, you can target one additional humanoid for each slot level above 1st."] }] };

const root = { _meta: { edition: "one", sources: [{ json: "Test" }] }, condition: [dazed, whispered], spell: [spell] };

describe("conditionMarkers", () => {
  it.each([
    ["A creature can't attack.", ["disable_melee_attacks", "disable_ranged_attacks"]],
    ["It can’t cast a spell that targets an enemy.", ["no_hostile_spells"]],
    ["The creature can't deal damage.", ["no_damage_dealt"]],
    ["The creature can't move or take actions.", ["immobilized", "skip_action"]],
    ["Its speed is 0.", ["immobilized"]],
  ])("recognizes %s", (text, markers) => {
    expect(conditionMarkers(text)).toEqual({ markers, recognized: true });
  });

  it("does not read markers from text without a negation", () => {
    expect(conditionMarkers("The creature may attack and deal damage.")).toEqual({ markers: [], recognized: false });
  });

  it("flags a negated sentence that maps to nothing", () => {
    expect(conditionMarkers("It can't attack. It can't hold a secret.").recognized).toBe(false);
  });
});

describe("customConditionKey", () => {
  it("slugs names and rejects ones without latin letters or digits", () => {
    expect(customConditionKey("Dazed Mind!")).toBe("custom:dazed-mind");
    expect(customConditionKey("Заціпеніння")).toBeNull();
  });
});

describe("deriveCustomConditions", () => {
  it("builds rules with markers and skips 5e names", () => {
    const rows = deriveCustomConditions({ condition: [dazed, { name: "Blinded", entries: ["x"] }] });

    expect(rows[0].rule).toMatchObject({ key: "custom:dazed", name: "Dazed", markers: ["disable_melee_attacks", "disable_ranged_attacks", "no_hostile_spells", "no_damage_dealt"] });
    expect(rows[1].rule).toBeNull();
  });
});

describe("import of the condition category", () => {
  const adapted = adaptCompendium(root);

  it("warns only about the condition text the engine cannot read", () => {
    expect(adapted.issues.filter((i) => i.code === "MANUAL_CONDITION_TEXT").map((i) => i.path)).toEqual(["condition[1]"]);
  });

  it("makes a spell inflicting a book condition native with save-ends and a humanoid filter", () => {
    const entry = adapted.entries.find((e) => e.kind === "spells")!;

    expect(entry.body).toMatchObject({ executionMode: "native", targeting: { kind: "enemy", filter: { creatureTypes: ["humanoid"] } }, resolution: { kind: "save", ability: "wisdom" }, upcastTargets: 1, spellEffects: [{ kind: "applyCondition", condition: "custom:dazed", saveEnds: { ability: "wisdom" } }] });
    expect(entry.issues.map((i) => i.code)).toEqual([]);
  });

  it("keeps a condition missing from the file unsupported", () => {
    const entry = adaptCompendium({ ...root, condition: [] }).entries.find((e) => e.kind === "spells")!;

    expect(entry.body.executionMode).toBe("manual");
    expect(entry.issues.map((i) => i.code)).toEqual(["MANUAL_SPELL_UNSUPPORTED_CONDITION"]);
  });
});

describe("rules patch for book conditions", () => {
  const json = JSON.stringify(root);

  const preview = (ctx: Record<string, unknown>, rulesPatch?: Record<string, unknown>) => {
    const repo = { authorize: async () => undefined, loadContext: async () => ({ campaignId: "c", existing: [], ...ctx }) } as unknown as ImportRepository;

    return previewImport(actor, { json, rulesPatch }, secret, repo).then((r) => r.report);
  };

  it("recommends the missing conditions and holds readyToPlay back", async () => {
    const report = await preview({});

    expect(report.recommendedRulesPatch).toMatchObject({ conditions: { custom: [{ key: "custom:dazed" }, { key: "custom:whispered" }] } });
    expect(report.readyToPlay).toBe(false);
  });

  it("offers nothing for keys already in the campaign rules or in the applied patch", async () => {
    const known = await preview({ customConditionKeys: ["custom:dazed", "custom:whispered"] });

    expect(known.recommendedRulesPatch).toBeUndefined();

    const patched = await preview({}, { conditions: { custom: [{ key: "custom:dazed", name: "Dazed", description: "", markers: [] }, { key: "custom:whispered", name: "Whispered", description: "", markers: [] }] } });

    expect(patched.recommendedRulesPatch).toBeUndefined();
  });

  it("recommends only the keys the campaign lacks", async () => {
    const report = await preview({ customConditionKeys: ["custom:dazed"] });

    expect(report.recommendedRulesPatch).toEqual({ conditions: { custom: [expect.objectContaining({ key: "custom:whispered" })] } });
  });
});
