import { describe, expect, it } from "vitest";

import { SRD_CREDITS } from "../lib/credits";
import { SRD_RULES } from "../lib/rules-preset";
import { OPEN5E_FILES, OPEN5E_SHA, open5eUrl } from "../lib/source";

import { parseRules } from "@/lib/utils/rules/schema";

describe("SRD rules preset", () => {
  it("matches the spec table and survives parseRules unchanged", () => {
    expect(parseRules(SRD_RULES)).toEqual(SRD_RULES);
    expect(SRD_RULES.morale.enabled).toBe(false);
    expect(SRD_RULES.criticals).toMatchObject({ critOn: 20, fumbleOn: 1, effects: false, doubleDice: true });
    expect(SRD_RULES.formulas).toEqual({ saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 });
    expect(SRD_RULES.saves.proficiency).toBe(true);
    expect(SRD_RULES.deathSaves).toEqual({ enabled: true, unitsDieAtZero: true });
    expect(SRD_RULES.concentration.enabled).toBe(true);
    expect(SRD_RULES.conditions).toEqual({ enabled: true, exhaustion: "2024" });
    expect(SRD_RULES.actions).toEqual({ enabled: true, opportunityAttacks: true, variant: "2024" });
    expect(SRD_RULES.classes.enabled).toBe(true);
    expect(SRD_RULES.outOfCombat).toEqual({ persistResources: true, longRestHitDice: "all", xp: true, inspiration: true });
    expect(SRD_RULES.encounters).toEqual({ balance: "xp", edition: "2024", autoXp: true });
    expect(SRD_RULES.defaultAttacks).toEqual({ meleeName: "Unarmed Strike", rangedName: "Ranged Attack" });
    expect(SRD_RULES.initiative).toEqual({ heroMin: 0, heroMax: 20 });
  });
});

describe("SRD source and credits", () => {
  it("pins 17 Open5e files with md5 and a raw URL at the SHA", () => {
    expect(Object.keys(OPEN5E_FILES)).toHaveLength(17);
    expect(Object.values(OPEN5E_FILES).every((h) => /^[0-9a-f]{32}$/.test(h))).toBe(true);
    expect(open5eUrl("Spell")).toBe(`https://raw.githubusercontent.com/open5e/open5e-api/${OPEN5E_SHA}/data/v2/wizards-of-the-coast/srd-2024/Spell.json`);
  });

  it("credits carry the CC-BY attribution and the Open5e commit, no icon packs", () => {
    expect(SRD_CREDITS.startsWith('This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC')).toBe(true);
    expect(SRD_CREDITS).toContain("https://creativecommons.org/licenses/by/4.0/legalcode.");
    expect(SRD_CREDITS).toContain(`Data via Open5e (open5e/open5e-api, commit ${OPEN5E_SHA}).`);
    expect(SRD_CREDITS).not.toMatch(/Painterly|Dungeon Crawl/);
  });
});
