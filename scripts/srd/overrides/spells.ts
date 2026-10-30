import type { SpellRow } from "../lib/types";

import type { NonRandomEffect } from "@/lib/utils/abilities/schema";
import type { SpellEffect, SpellTargeting, SpellZone, ZoneTrigger } from "@/lib/utils/spells/model/schema";

export type SpellOverride = Partial<Omit<SpellRow, "slug" | "name" | "level" | "groupId" | "description">>;

const rounds = (n: number) => ({ rounds: n });

const NO_DAMAGE: SpellOverride = { dice: 0, dieSides: undefined, upcastDice: undefined, spellEffects: [] };

const resist = (damageType: string, percent = 50, n = 99): NonRandomEffect => ({ kind: "flag", flag: "resistance", damageType, percent, duration: rounds(n) });

const damageChoice = (types: string[]): SpellEffect => ({ kind: "chooseOne", options: types.map((damageType): NonRandomEffect => ({ kind: "dealDamage", amount: { spellRoll: 100 }, damageType })) });

const smite = (extraDice: string, damageType: string): SpellEffect => ({ kind: "hitRider", attackKind: "melee", extraDice, damageType, charges: 1, duration: rounds(1), expireAtTurnEnd: true });

const sphere = (radius: number, range: number, zone: SpellZone): SpellTargeting => ({ kind: "template", shape: "circle", size: radius, side: "enemy", maxTargets: 20, exact: true, range, zone });

const noCasting: ZoneTrigger = { effects: [{ kind: "applyCondition", condition: "disable_spell_casting", duration: rounds(1) }] };

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
  "srd-2024_wish": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" } },
  "srd-2024_longstrider": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 10, duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_blur": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_mirror-image": { targeting: { kind: "self" }, spellEffects: [{ kind: "flag", flag: "disadvantageForAttackers", duration: rounds(10) }] },
  "srd-2024_greater-invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(10) }] },
  "srd-2024_invisibility": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: rounds(99) }], upcastTargets: 1 },
  "srd-2024_heroism": { targeting: { kind: "ally", range: 5 }, spellEffects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], duration: rounds(10) }], upcastTargets: 1 },
  "srd-2024_divine-favor": { targeting: { kind: "self" }, spellEffects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2, duration: rounds(10) }] },
  "srd-2024_spiritual-weapon": { addAbilityMod: true },
  "srd-2024_scorching-ray": { upcastTargets: 1 },
  "srd-2024_chain-lightning": { upcastTargets: 1 },

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
    ingredients: [{ name: "Platinum rings", qty: 2, minGp: 50, consumed: false, focus: false }],
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

  // the cast picks the damage type; orb leaps and the d8-explosion are left to the DM
  "srd-2024_chromatic-orb": { dice: 3, dieSides: 8, upcastDice: 1, targeting: { kind: "enemy", range: 90 }, resolution: { kind: "attack" }, spellEffects: [damageChoice(["acid", "cold", "fire", "lightning", "poison", "thunder"])] },
  "srd-2024_sorcerous-burst": { dice: 1, dieSides: 8, targeting: { kind: "enemy", range: 120 }, resolution: { kind: "attack" }, spellEffects: [damageChoice(["acid", "cold", "fire", "lightning", "poison", "psychic", "thunder"])] },
  // cast right before the hit: the extra dice ride on the next melee hit of the turn (fiend/undead bonus die and upcast stay manual)
  "srd-2024_divine-smite": { targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [smite("2d8", "radiant")] },
  "srd-2024_shining-smite": { targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [smite("2d6", "radiant")] },
  "srd-2024_power-word-heal": { spellEffects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 100 } }, { kind: "cleanse", includeConditions: true }] },
  "srd-2024_regenerate": { spellEffects: [{ kind: "heal", amount: "4d8" }, { kind: "heal", amount: 15 }, { kind: "hot", healPerRound: 1, duration: rounds(99) }] },
  // the retaliation 2d8 is not expressible; only the chosen resistance is mechanized
  "srd-2024_fire-shield": { ...NO_DAMAGE, targeting: { kind: "self" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "chooseOne", options: [resist("cold"), resist("fire")] }] },
  "srd-2024_aura-of-life": { spellEffects: [resist("necrotic")] },

  // zone effects last at most 10 rounds on the map; spikes hurt on entering the zone, not per 5 feet moved
  "srd-2024_fog-cloud": { ...NO_DAMAGE, targeting: sphere(20, 120, { rounds: 10, terrain: ["obscured"], side: "all" }) },
  "srd-2024_darkness": { ...NO_DAMAGE, targeting: sphere(15, 60, { rounds: 10, terrain: ["obscured"], side: "all" }) },
  "srd-2024_true-strike": { ingredients: [] },
  "srd-2024_gentle-repose": { ingredients: [{ name: "Copper pieces", qty: 2, minGp: 0.02, consumed: true, focus: false }] },
  "srd-2024_spike-growth": {
    ...NO_DAMAGE,
    targeting: sphere(20, 150, { rounds: 10, terrain: ["difficult"], side: "all", onEnter: { effects: [{ kind: "dealDamage", amount: "2d4", damageType: "piercing" }] } }),
  },
  "srd-2024_gust-of-wind": {
    ...NO_DAMAGE,
    targeting: { kind: "template", shape: "line", size: 60, side: "enemy", maxTargets: 20 },
    resolution: { kind: "save", ability: "strength", onSuccess: "none" },
    spellEffects: [{ kind: "push", feet: 15, from: "caster" }],
  },
  // the panels become a 100-foot line of wall cells; its immunity to damage and dispel is not modelled
  "srd-2024_wall-of-force": {
    ...NO_DAMAGE,
    targeting: { kind: "template", shape: "line", size: 100, side: "enemy", maxTargets: 1, range: 120 },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "createTerrain", terrain: "wall", shape: "cell", cells: 20, rounds: 99 }],
  },
  // everyone inside, the caster included, loses spellcasting; magic items and area suppression stay manual
  "srd-2024_antimagic-field": {
    ...NO_DAMAGE,
    targeting: { kind: "self" },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "anchoredZone", radiusFeet: 10, side: "all", onEnter: noCasting, onTurnStart: noCasting, endsWhenStartOutside: true, duration: rounds(99) }],
  },
};
