import type { AbilityCore } from "../lib/abilities";

import type { AbilityKey } from "@/lib/constants/abilities";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import type { Condition, Effect } from "@/lib/utils/abilities/schema";
import type { ClassColumn } from "@/types/classes";

export type FeatureOption = AbilityCore & { name: string; slug: string };

const EXTRA_ATTACK: AbilityCore = { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] };

const passive = (effects: AbilityCore["effects"], condition?: Condition): AbilityCore => ({ trigger: { event: "passive" }, effects, ...(condition && { condition }) });

const NOT_HEAVY: Condition = { type: "armorWorn", categories: ["none", "light", "medium"] };

const UNARMORED: Condition = { type: "armorWorn", categories: ["none"] };

const UNARMORED_NO_SHIELD: Condition = { type: "armorWorn", categories: ["none"], shield: "without" };

const RAGING: Condition = { type: "hasMark", who: "self", markId: "rage" };

const SNEAK: Condition = {
  type: "any",
  conditions: [
    { type: "attackRollMode", mode: "advantage" },
    { type: "all", conditions: [{ type: "allyAdjacent" }, { type: "not", condition: { type: "attackRollMode", mode: "disadvantage" } }] },
  ],
};

const resist = (damageType: string): Effect => ({ kind: "flag", flag: "resistance", damageType, percent: 50, duration: { rounds: 10 } });

const NON_FORCE = ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

const pool = (key: string, cost = 1) => ({ pool: { key, cost } });

const note = (text: string): Effect => ({ kind: "note", text });

// incremental: Two/Three Extra Attacks stack with Extra Attack, Superior Critical with Improved Critical
export const CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore | FeatureOption[]> = {
  "srd-2024_barbarian_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_extra-attack": EXTRA_ATTACK,
  "srd-2024_paladin_extra-attack": EXTRA_ATTACK,
  "srd-2024_ranger_extra-attack": EXTRA_ATTACK,
  "srd-2024_monk_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_two-extra-attacks": EXTRA_ATTACK,
  "srd-2024_fighter_three-extra-attacks": EXTRA_ATTACK,
  // the action is spent first: the first granted action returns it, the second goes to the pool
  "srd-2024_fighter_action-surge": { trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: { scale: "action-surge" } } }, effects: [{ kind: "grantAction", extraActions: 2 }] },
  "srd-2024_fighter_second-wind": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: { scale: "second-wind-uses" }, shortRegain: 1 } },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "class_level" }, target: "self" },
    ],
  },
  "srd-2024_fighter_champion_improved-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_superior-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_remarkable-athlete": passive([{ kind: "flag", flag: "checkAdvantage", skills: ["athletics"] }]),
  "srd-2024_fighter_champion_survivor": { trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "heal", amount: { formula: "5 + con_mod" }, target: "self" }] },
  "srd-2024_barbarian_danger-sense": passive([{ kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"] }]),
  // free in the SRD: the bonus action is refreshed, so use it before Rage; melee approximates "Strength attack rolls"
  "srd-2024_barbarian_reckless-attack": {
    trigger: { event: "bonusAction" },
    effects: [
      { kind: "flag", flag: "advantage", attackKind: "melee", duration: { rounds: 1 }, target: "self" },
      { kind: "flag", flag: "advantageForAttackers", duration: { rounds: 1 }, target: "self" },
      { kind: "grantAction", refreshBonusAction: true, target: "self" },
    ],
  },
  // advantage lasts until the next turn start (not consumed by the first attack), "haven't moved" is not checked
  "srd-2024_rogue_steady-aim": {
    trigger: { event: "bonusAction" },
    effects: [
      { kind: "flag", flag: "advantage", attackKind: "all", duration: { rounds: 1 }, target: "self" },
      { kind: "modifyStat", stat: "speed", percent: -100, duration: { rounds: 1 }, target: "self" },
    ],
  },
  "srd-2024_barbarian_unarmored-defense": passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "max(0, con_mod)" } }], UNARMORED),
  "srd-2024_barbarian_fast-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }], NOT_HEAVY),
  "srd-2024_barbarian_primal-champion": passive([
    { kind: "modifyStat", stat: "strength", flat: 4 },
    { kind: "modifyStat", stat: "constitution", flat: 4 },
  ]),
  "srd-2024_barbarian_rage": {
    trigger: { event: "bonusAction" },
    condition: NOT_HEAVY,
    limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
    effects: [
      resist("bludgeoning"),
      resist("piercing"),
      resist("slashing"),
      { kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } },
      { kind: "mark", markId: "rage", duration: { rounds: 10 }, target: "self" },
    ],
  },
  "srd-2024_barbarian_relentless-rage": { trigger: { event: "lethalDamage" }, condition: RAGING, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "heal", amount: { formula: "2 * class_level" }, revive: true, target: "self" }] },
  "srd-2024_path-of-the-berserker_mindless-rage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed", "frightened"] }], RAGING),
  "srd-2024_path-of-the-berserker_retaliation": passive([{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }]),
  "srd-2024_bard_bardic-inspiration": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } }, effects: [{ kind: "mark", markId: "bardic-inspiration", duration: { rounds: 99 }, target: "eventTarget" }] },
  "srd-2024_cleric_channel-divinity": [
    { name: "Divine Spark", slug: "divine-spark", trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "heal", amount: { scale: "divine-spark" }, target: "eventTarget" }, { kind: "heal", amount: { formula: "wis_mod" }, target: "eventTarget" }] },
    { name: "Turn Undead", slug: "turn-undead", trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [note("Turn Undead")] },
  ],
  "srd-2024_cleric_life-domain_preserve-life": { trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "heal", amount: { formula: "5 * class_level" }, target: "eventTarget" }] },
  "srd-2024_paladin_lay-on-hands": { trigger: { event: "bonusAction" }, limits: pool("lay-on-hands", 5), effects: [{ kind: "heal", amount: 5, target: "eventTarget" }] },
  "srd-2024_paladin_channel-divinity": [{ name: "Divine Sense", slug: "divine-sense", trigger: { event: "bonusAction" }, limits: pool("channel-divinity-uses"), effects: [note("Divine Sense")] }],
  "srd-2024_paladin_oath-of-devotion_sacred-weapon": { trigger: { event: "bonusAction" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "modifyStat", stat: "attackBonus", flat: { formula: "max(1, cha_mod)" }, duration: { rounds: 10 }, target: "self" }] },
  // the owner is a member of their own ally zone
  "srd-2024_paladin_aura-of-protection": passive([{ kind: "modifyStat", stat: "savingThrow", flat: { formula: "max(1, cha_mod)" }, target: "nearbyAllies" }]),
  "srd-2024_paladin_radiant-strikes": { trigger: { event: "hit", role: "attacker", attackKind: "melee" }, effects: [{ kind: "dealDamage", amount: "1d8", damageType: "radiant", target: "eventTarget" }] },
  "srd-2024_rogue_slippery-mind": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["wisdom", "charisma"] }]),
  "srd-2024_rogue_sneak-attack": { trigger: { event: "hit", role: "attacker" }, condition: SNEAK, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: { scale: "sneak-attack" }, target: "eventTarget" }] },
  "srd-2024_rogue_uncanny-dodge": { trigger: { event: "hit", role: "target" }, limits: { perRound: 1 }, effects: [{ kind: "heal", amount: { percentOf: "eventDamage", value: 50 }, target: "self" }] },
  "srd-2024_rogue_evasion": passive([{ kind: "flag", flag: "evasion" }]),
  "srd-2024_rogue_cunning-action": passive([{ kind: "flag", flag: "cunningAction" }]),
  "srd-2024_monk_unarmored-defense": passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "wis_mod" } }], UNARMORED_NO_SHIELD),
  "srd-2024_monk_unarmored-movement": passive([{ kind: "modifyStat", stat: "speed", flat: { scale: "unarmored-movement" } }], UNARMORED_NO_SHIELD),
  "srd-2024_monk_monks-focus": [
    {
      name: "Patient Defense",
      slug: "patient-defense",
      trigger: { event: "bonusAction" },
      limits: pool("focus-points"),
      effects: [
        { kind: "flag", flag: "disadvantageForAttackers", duration: { rounds: 1 } },
        { kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"], duration: { rounds: 1 } },
      ],
    },
    { name: "Flurry of Blows", slug: "flurry-of-blows", trigger: { event: "bonusAction" }, limits: pool("focus-points"), effects: [note("Flurry of Blows")] },
    { name: "Step of the Wind", slug: "step-of-the-wind", trigger: { event: "bonusAction" }, limits: pool("focus-points"), effects: [note("Step of the Wind")] },
  ],
  "srd-2024_monk_superior-defense": { trigger: { event: "bonusAction" }, limits: pool("focus-points", 3), effects: NON_FORCE.map(resist) },
  "srd-2024_monk_deflect-attacks": {
    trigger: { event: "hit", role: "target" },
    limits: { perRound: 1 },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "dex_mod + class_level" }, target: "self" },
    ],
  },
  "srd-2024_monk_warrior-of-the-open-hand_wholeness-of-body": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: { formula: "max(1, wis_mod)" } } },
    effects: [
      { kind: "heal", amount: { scale: "martial-arts-dice" }, target: "self" },
      { kind: "heal", amount: { formula: "wis_mod" }, target: "self" },
    ],
  },
  "srd-2024_monk_uncanny-metabolism": {
    trigger: { event: "battleStart" },
    limits: { perRest: { rest: "long", uses: 1 } },
    effects: [
      { kind: "heal", amount: { scale: "martial-arts-dice" }, target: "self" },
      { kind: "heal", amount: { formula: "class_level" }, target: "self" },
    ],
  },
  "srd-2024_monk_evasion": passive([{ kind: "flag", flag: "evasion" }]),
  "srd-2024_monk_disciplined-survivor": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] }]),
  "srd-2024_ranger_roving": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_paladin_aura-of-courage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], target: "nearbyAllies" }]),
  "srd-2024_paladin_oath-of-devotion_aura-of-devotion": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed"], target: "nearbyAllies" }]),
  "srd-2024_druid_circle-of-the-land_natures-ward": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["poisoned"] }]),
  "srd-2024_druid_wild-shape": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "short", uses: { scale: "wild-shape-uses" } } }, effects: [
      // no temp-HP effect: the Beast form's Temporary Hit Points (= Druid level) are approximated by a heal
      { kind: "heal", amount: { formula: "class_level" }, target: "self" },
      { kind: "mark", markId: "wild-shape", duration: { rounds: 99 }, target: "self" },
    ],
  },
  "srd-2024_sorcerer_font-of-magic": [{ name: "Create Spell Slot", slug: "create-slot", trigger: { event: "bonusAction" }, limits: pool("sorcery-points", 2), effects: [{ kind: "restoreSpellSlot", count: 1, target: "self" }] }],
  "srd-2024_sorcerer_innate-sorcery": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: 2 } }, effects: [{ kind: "flag", flag: "advantage", attackKind: "all", duration: { rounds: 10 } }] },
  // HP must not depend on armor, so the AC part is a separate ability
  "srd-2024_sorcerer_draconic-sorcery_draconic-resilience": [
    { name: "Draconic Resilience", slug: "hp", ...passive([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "class_level" } }]) },
    { name: "Draconic Resilience: AC", slug: "ac", ...passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "cha_mod" } }], UNARMORED) },
  ],
  "srd-2024_wizard_evoker_empowered-evocation": passive([{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" }, flat: { formula: "int_mod" } }]),
};

// Open5e has no level rows for these
export const FEATURE_LEVELS: Record<string, number> = {
  "srd-2024_bard_bard-subclass": 3,
  "srd-2024_monk_deflect-attacks": 3,
  "srd-2024_sorcerer_metamagic-options": 2,
  "srd-2024_warlock_eldritch-invocation-options": 1,
};

// a class-table column without a feature_type
export const DROP_FEATURES: ReadonlySet<string> = new Set(["srd-2024_druid_wild-shape-uses"]);

// features whose level rows are a class-table column (besides CLASS_TABLE_DATA)
export const COLUMN_FEATURES: ReadonlySet<string> = new Set(["srd-2024_druid_wild-shape-uses", "srd-2024_monk_unarmored-movement"]);

// spell slots come from classSpellSlots
export const DROP_COLUMNS: ReadonlySet<string> = new Set(["srd-2024_warlock_slot-level", "srd-2024_warlock_spell-slots"]);

// Open5e names this column «Cantrips Known»
export const COLUMN_LABELS: Record<string, string> = { "srd-2024_druid_wild-shape-uses": "Wild Shape" };

export const POOL_COLUMNS: Record<string, { rest: "short" | "long" }> = {
  "srd-2024_monk_focus-points": { rest: "short" },
  "srd-2024_sorcerer_sorcery-points": { rest: "long" },
  "srd-2024_cleric_channel-divinity-uses": { rest: "short" },
  "srd-2024_paladin_channel-divinity-uses": { rest: "short" },
};

const levels = (f: (level: number) => string) => Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => f(i + 1));

// numbers from the SRD text that have no table column in Open5e
export const EXTRA_COLUMNS: Record<string, ClassColumn[]> = {
  "srd-2024_fighter": [{ key: "action-surge", label: "Action Surge", values: levels((l) => (l >= 17 ? "2" : l >= 2 ? "1" : "")) }],
  "srd-2024_cleric": [{ key: "divine-spark", label: "Divine Spark", values: levels((l) => (l >= 18 ? "4d8" : l >= 13 ? "3d8" : l >= 7 ? "2d8" : l >= 2 ? "1d8" : "")) }],
  "srd-2024_sorcerer": [{ key: "metamagic", label: "Metamagic", values: levels((l) => (l >= 17 ? "6" : l >= 10 ? "4" : l >= 2 ? "2" : "")) }],
  "srd-2024_paladin": [{ key: "lay-on-hands", label: "Lay on Hands", values: levels((l) => String(5 * l)), pool: { rest: "long" } }],
};

// level rows now scale through a column: one ability at the first level
export const SINGLE_LEVEL_FEATURES: ReadonlySet<string> = new Set(["srd-2024_fighter_action-surge"]);

export const SPELLCASTING_ABILITY: Record<string, AbilityKey> = {
  "srd-2024_bard": "charisma",
  "srd-2024_cleric": "wisdom",
  "srd-2024_druid": "wisdom",
  "srd-2024_paladin": "charisma",
  "srd-2024_ranger": "wisdom",
  "srd-2024_sorcerer": "charisma",
  "srd-2024_warlock": "charisma",
  "srd-2024_wizard": "intelligence",
};

export const TYPO_FIXES: Record<string, string> = { "Lay On Hands": "Lay on Hands", "Studdied Attacks": "Studied Attacks", "Unarmoed Movement": "Unarmored Movement" };

// Open5e lists Dexterity for the Fighter; SRD 5.2 says Strength and Constitution
export const SAVING_THROW_FIXES: Record<string, AbilityKey[]> = { "srd-2024_fighter": ["strength", "constitution"] };
