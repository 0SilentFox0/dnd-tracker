import type { Effect, StaticEffect } from "./effects";
import type { Trigger } from "./triggers";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { AttackType, EffectMarker } from "@/lib/constants/battle";
import { DICE_PATTERN } from "@/lib/utils/common/dice";

export const DICE_RE = DICE_PATTERN;

export const MANEUVERS = ["dive", "squall", "fireBurst"] as const;

export const ABILITY_TARGETS = ["self", "eventTarget", "eventActor", "otherEnemy", "allAllies", "allEnemies", "everyone", "nearbyAllies", "nearbyEnemies"] as const;

/** Аури в області: без позицій на полі ціль обирає власник на початку свого ходу. */
export const AREA_TARGETS = ["nearbyAllies", "nearbyEnemies"] as const;

export type AreaTarget = (typeof AREA_TARGETS)[number];

export const isAreaTarget = (t: string | undefined): t is AreaTarget => (AREA_TARGETS as readonly string[]).includes(t ?? "");

export const PASSIVE_TARGETS: ReadonlySet<string> = new Set(["self", "allAllies", "allEnemies", ...AREA_TARGETS]);

export const ATTACK_KINDS = [AttackType.MELEE, AttackType.RANGED] as const;

export const DAMAGE_KINDS = [AttackType.MELEE, AttackType.RANGED, "magic"] as const;

export const DAMAGE_FILTER_KINDS = [AttackType.MELEE, AttackType.RANGED, "magic", "physical", "all"] as const;

export const CONDITION_SUBJECTS = ["self", "eventTarget", "eventActor", "anyAlly", "anyEnemy"] as const;

export const DYNAMIC_STATS = ["armor", "attackBonus", "critThreshold", "actionsPerTurn", "savingThrow", "attacksPerAction"] as const;

export const BAKED_STATS = [
  "initiative",
  "maxHp",
  "speed",
  "morale",
  "minTargets",
  "maxTargets",
  "spellSlots",
  ...ABILITY_KEYS,
] as const;

export const STAT_KEYS = [...DYNAMIC_STATS, ...BAKED_STATS] as const;

export const TIMED_STATS = ["armor", "attackBonus", "critThreshold", "initiative", "speed", "morale", "actionsPerTurn", "savingThrow"] as const;

export const CONDITION_KEYS = [
  EffectMarker.NO_BONUS_ACTION,
  EffectMarker.NO_REACTION,
  "disable_melee_attacks",
  "disable_ranged_attacks",
  "disable_spell_casting",
  EffectMarker.SKIP_ACTION,
  EffectMarker.IMMOBILIZED,
] as const;

export const CONDITION_5E_KEYS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
] as const;

export type Condition5eKey = (typeof CONDITION_5E_KEYS)[number];

export const isCondition5eKey = (key: unknown): key is Condition5eKey => (CONDITION_5E_KEYS as readonly unknown[]).includes(key);

export type AnyConditionKey = (typeof CONDITION_KEYS)[number] | Condition5eKey;

export type AbilityTarget = (typeof ABILITY_TARGETS)[number];

export type AttackKind = (typeof ATTACK_KINDS)[number];

export type DamageKind = (typeof DAMAGE_KINDS)[number];

export type DamageFilterKind = (typeof DAMAGE_FILTER_KINDS)[number];

export type ConditionSubject = (typeof CONDITION_SUBJECTS)[number];

export type StatKey = (typeof STAT_KEYS)[number];

export type ConditionImmunityKey = AnyConditionKey | "fear" | "berserk" | "charm";

export function isStaticEffect(e: Effect): e is StaticEffect {
  return e.kind === "modifyStat" || e.kind === "damageBonus" || e.kind === "flag";
}

export function isBakedStat(stat: StatKey): boolean {
  return (BAKED_STATS as readonly string[]).includes(stat);
}

export function isActionScopedTrigger(t: Trigger): boolean {
  return (t.event === "attack" || t.event === "spellCast") && t.phase === "before";
}
