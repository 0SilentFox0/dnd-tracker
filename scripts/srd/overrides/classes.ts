import type { AbilityCore } from "../lib/abilities";

import type { AbilityKey } from "@/lib/constants/abilities";

const EXTRA_ATTACK: AbilityCore = { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] };

const passive = (effects: AbilityCore["effects"]): AbilityCore => ({ trigger: { event: "passive" }, effects });

// incremental: Two/Three Extra Attacks stack with Extra Attack, Superior Critical with Improved Critical
export const CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore> = {
  "srd-2024_barbarian_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_extra-attack": EXTRA_ATTACK,
  "srd-2024_paladin_extra-attack": EXTRA_ATTACK,
  "srd-2024_ranger_extra-attack": EXTRA_ATTACK,
  "srd-2024_monk_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_two-extra-attacks": EXTRA_ATTACK,
  "srd-2024_fighter_three-extra-attacks": EXTRA_ATTACK,
  // the action is spent first: the first granted action returns it, the second goes to the pool
  "srd-2024_fighter_action-surge": { trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "grantAction", extraActions: 2 }] },
  "srd-2024_fighter_second-wind": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: 2 } },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "hero_level" }, target: "self" },
    ],
  },
  "srd-2024_fighter_champion_improved-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_superior-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_remarkable-athlete": passive([{ kind: "flag", flag: "checkAdvantage", skills: ["athletics"] }]),
  "srd-2024_barbarian_danger-sense": passive([{ kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"] }]),
  "srd-2024_barbarian_fast-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_barbarian_primal-champion": passive([
    { kind: "modifyStat", stat: "strength", flat: 4 },
    { kind: "modifyStat", stat: "constitution", flat: 4 },
  ]),
  "srd-2024_barbarian_rage": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: 2 } },
    effects: [
      { kind: "flag", flag: "resistance", damageType: "bludgeoning", percent: 50, duration: { rounds: 10 } },
      { kind: "flag", flag: "resistance", damageType: "piercing", percent: 50, duration: { rounds: 10 } },
      { kind: "flag", flag: "resistance", damageType: "slashing", percent: 50, duration: { rounds: 10 } },
      { kind: "damageBonus", filter: { kind: "melee" }, flat: 2, duration: { rounds: 10 } },
    ],
  },
  "srd-2024_rogue_slippery-mind": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["wisdom", "charisma"] }]),
  "srd-2024_monk_unarmored-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_monk_disciplined-survivor": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] }]),
  "srd-2024_ranger_roving": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_paladin_aura-of-courage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], target: "nearbyAllies" }]),
  "srd-2024_paladin_oath-of-devotion_aura-of-devotion": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed"], target: "nearbyAllies" }]),
  "srd-2024_druid_circle-of-the-land_natures-ward": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["poisoned"] }]),
  "srd-2024_sorcerer_draconic-sorcery_draconic-resilience": passive([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }]),
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

export const TYPO_FIXES: Record<string, string> = { "Studdied Attacks": "Studied Attacks", "Unarmoed Movement": "Unarmored Movement" };

// Open5e lists Dexterity for the Fighter; SRD 5.2 says Strength and Constitution
export const SAVING_THROW_FIXES: Record<string, AbilityKey[]> = { "srd-2024_fighter": ["strength", "constitution"] };
