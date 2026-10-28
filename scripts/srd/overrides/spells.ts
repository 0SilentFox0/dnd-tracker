import type { SpellRow } from "../lib/types";

import type { Effect } from "@/lib/utils/abilities/schema";

export type SpellOverride = Partial<Omit<SpellRow, "slug" | "name" | "level" | "groupId" | "description">>;

const rounds = (n: number) => ({ rounds: n });

const NO_DAMAGE: SpellOverride = { dice: 0, dieSides: undefined, upcastDice: undefined, spellEffects: [] };

const resist = (damageType: string, percent = 50, n = 99): Effect => ({ kind: "flag", flag: "resistance", damageType, percent, duration: rounds(n) });

// sides/targets of popular spells and timed buffs (flat approximations of 1d4 bonuses), checked by hand against SRD 5.2
export const SPELL_OVERRIDES: Record<string, SpellOverride> = {
  "srd-2024_bless": {
    ...NO_DAMAGE,
    targeting: { kind: "area", side: "ally", maxTargets: 3, range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [
      { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: 2, duration: rounds(10) },
    ],
    upcastTargets: 1,
  },
  "srd-2024_bane": {
    ...NO_DAMAGE,
    targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 30 },
    resolution: { kind: "save", ability: "charisma", onSuccess: "none" },
    spellEffects: [
      { kind: "modifyStat", stat: "attackBonus", flat: -2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: -2, duration: rounds(10) },
    ],
    upcastTargets: 1,
  },
  "srd-2024_shield": { targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 5, duration: rounds(1) }] },
  "srd-2024_shield-of-faith": { targeting: { kind: "ally", range: 60 }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 2, duration: rounds(99) }] },
  "srd-2024_mage-armor": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 3, duration: rounds(99) }] },
  "srd-2024_haste": {
    targeting: { kind: "ally", range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [
      { kind: "modifyStat", stat: "armor", flat: 2, duration: rounds(10) },
      { kind: "modifyStat", stat: "actionsPerTurn", flat: 1, duration: rounds(10) },
      { kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"], duration: rounds(10) },
    ],
  },
  "srd-2024_slow": {
    targeting: { kind: "template", shape: "cube", size: 40, side: "enemy", maxTargets: 6, range: 120 },
    resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
    spellEffects: [
      { kind: "modifyStat", stat: "armor", flat: -2, duration: rounds(10) },
      { kind: "modifyStat", stat: "savingThrow", flat: -2, duration: rounds(10) },
    ],
  },
  "srd-2024_faerie-fire": { resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, spellEffects: [{ kind: "flag", flag: "advantageForAttackers", duration: rounds(10) }] },
  "srd-2024_magic-missile": {
    dice: 1,
    dieSides: 4,
    targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 120 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "force" }],
    upcastTargets: 1,
  },
  "srd-2024_heal": { targeting: { kind: "ally", range: 60 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "heal", amount: 70 }] },
  "srd-2024_prayer-of-healing": {
    dice: 2,
    dieSides: 8,
    targeting: { kind: "area", side: "ally", maxTargets: 5, range: 30 },
    resolution: { kind: "auto" },
    addAbilityMod: true,
    spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }],
    upcastDice: 1,
  },
  "srd-2024_revivify": { targeting: { kind: "allyDead", range: 5 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "heal", amount: 1, revive: true }] },
  "srd-2024_web": { ...NO_DAMAGE, resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, spellEffects: [{ kind: "applyCondition", condition: "restrained", duration: rounds(10), saveEnds: { ability: "strength" } }] },
  "srd-2024_entangle": {
    targeting: { kind: "template", shape: "cube", size: 20, side: "enemy", maxTargets: 20, range: 90 },
    resolution: { kind: "save", ability: "strength", onSuccess: "none" },
    spellEffects: [{ kind: "applyCondition", condition: "restrained", duration: rounds(10), saveEnds: { ability: "strength" } }],
  },
  "srd-2024_dimension-door": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_fire-shield": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_wish": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_spike-growth": { ...NO_DAMAGE },
  "srd-2024_longstrider": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 10, duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_blur": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_mirror-image": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_greater-invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(10) }] },
  "srd-2024_invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_heroism": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], duration: rounds(10) }], upcastTargets: 1 },
  "srd-2024_divine-favor": { targeting: { kind: "self" }, spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2, duration: rounds(10) }] },
  "srd-2024_spiritual-weapon": { addAbilityMod: true },
  "srd-2024_scorching-ray": { upcastTargets: 1 },

  // Open5e rows of these spells carry another spell's numbers (Freedom of Movement has Freezing Sphere's 10d6 cold)
  "srd-2024_freedom-of-movement": {
    ...NO_DAMAGE,
    targeting: { kind: "ally", range: 5 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["restrained", "grappled"], duration: rounds(99) }],
  },
  // self-range in the SRD, but the effect lands on a target
  "srd-2024_produce-flame": { targeting: { kind: "enemy", range: 60 } },
  "srd-2024_eyebite": { targeting: { kind: "enemy", range: 60 } },
  "srd-2024_sunbeam": { targeting: { kind: "template", shape: "line", size: 60, side: "enemy", maxTargets: 20 } },
  // the caster's own psychic damage is the real price of the spell
  "srd-2024_contact-other-plane": { targeting: { kind: "self" } },
  "srd-2024_hex": {
    ...NO_DAMAGE,
    targeting: { kind: "enemy", range: 90 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "flag", flag: "checkDisadvantage", skills: "all", duration: rounds(99) }, { kind: "mark", markId: "hex", duration: rounds(99) }],
  },
  "srd-2024_hunters-mark": { ...NO_DAMAGE, targeting: { kind: "enemy", range: 90 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "mark", markId: "hunters-mark", duration: rounds(99) }] },
  "srd-2024_barkskin": { spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 3, duration: rounds(99) }] },
  "srd-2024_stoneskin": { spellEffects: [resist("bludgeoning"), resist("piercing"), resist("slashing")] },
  "srd-2024_protection-from-poison": { spellEffects: [resist("poison")] },
  "srd-2024_enhance-ability": { spellEffects: [{ kind: "flag", flag: "checkAdvantage", skills: "all", duration: rounds(99) }] },
  "srd-2024_magic-weapon": { spellEffects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1, duration: rounds(99) }] },
  "srd-2024_fly": { spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 30, duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_expeditious-retreat": { targeting: { kind: "self" }, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 30, duration: rounds(99) }] },
  "srd-2024_resistance": { spellEffects: [{ kind: "modifyStat", stat: "savingThrow", flat: 2, duration: rounds(10) }] },
  "srd-2024_guidance": { spellEffects: [{ kind: "flag", flag: "checkAdvantage", skills: "all", duration: rounds(10) }] },
  "srd-2024_protection-from-evil-and-good": { spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(99) }] },
  "srd-2024_warding-bond": {
    spellEffects: [
      { kind: "modifyStat", stat: "armor", flat: 1, duration: rounds(99) },
      { kind: "modifyStat", stat: "savingThrow", flat: 1, duration: rounds(99) },
    ],
  },
  "srd-2024_mind-blank": { spellEffects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed"], duration: rounds(99) }] },
  "srd-2024_foresight": {
    spellEffects: [
      { kind: "flag", flag: "advantage", attackKind: "all", duration: rounds(99) },
      { kind: "flag", flag: "saveAdvantage", abilities: "all", duration: rounds(99) },
      { kind: "flag", flag: "disadvantageForAttackers", duration: rounds(99) },
    ],
  },
  "srd-2024_beacon-of-hope": {
    targeting: { kind: "area", side: "ally", maxTargets: 20, range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "flag", flag: "saveAdvantage", abilities: ["wisdom"], duration: rounds(10) }],
  },
  "srd-2024_enlargereduce": {
    targeting: { kind: "ally", range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2, duration: rounds(10) }, { kind: "flag", flag: "saveAdvantage", abilities: ["strength"], duration: rounds(10) }],
  },
  "srd-2024_lesser-restoration": { spellEffects: [{ kind: "cleanse", includeConditions: true }] },
  "srd-2024_greater-restoration": { spellEffects: [{ kind: "cleanse", includeConditions: true }] },
  "srd-2024_ray-of-enfeeblement": {
    resolution: { kind: "attack" },
    spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, percent: -50, duration: rounds(10) }],
  },
  "srd-2024_hideous-laughter": {
    resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
    spellEffects: [{ kind: "applyCondition", condition: "prone", duration: rounds(10), saveEnds: { ability: "wisdom" } }, { kind: "applyCondition", condition: "incapacitated", duration: rounds(10), saveEnds: { ability: "wisdom" } }],
  },
  "srd-2024_blindnessdeafness": {
    resolution: { kind: "save", ability: "constitution", onSuccess: "none" },
    spellEffects: [{ kind: "applyCondition", condition: "blinded", duration: rounds(10), saveEnds: { ability: "constitution" } }],
    upcastTargets: 1,
  },
  "srd-2024_maze": { targeting: { kind: "enemy", range: 60 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "applyCondition", condition: "incapacitated", duration: rounds(10) }] },
  // one damage type is chosen at cast time; fire is the approximation
  "srd-2024_protection-from-energy": { spellEffects: [resist("fire")] },
  "srd-2024_pass-without-trace": { targeting: { kind: "area", side: "ally", maxTargets: 20, range: 30 }, resolution: { kind: "auto" }, spellEffects: [{ kind: "flag", flag: "skillProficiency", skills: ["stealth"], duration: rounds(99) }] },
  "srd-2024_holy-aura": {
    targeting: { kind: "area", side: "ally", maxTargets: 20, range: 30 },
    resolution: { kind: "auto" },
    spellEffects: [
      { kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) },
      { kind: "flag", flag: "saveAdvantage", abilities: "all", duration: rounds(10) },
    ],
  },
  "srd-2024_blink": { spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
};
