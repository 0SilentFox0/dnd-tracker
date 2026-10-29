import { CONDITION_REGISTRY } from "../registry/conditions";
import { EFFECT_REGISTRY } from "../registry/effects";
import { FLAG_REGISTRY } from "../registry/effects/flags";
import { TRIGGER_REGISTRY } from "../registry/triggers";
import type { Ability, Condition, Effect, EffectKind, FlagKey, Limits, Trigger } from "../schema";

import { CONDITION_5E_KEYS, CONDITION_KEYS } from "@/lib/utils/abilities/schema/kinds";

const duration = { rounds: 2 };

const BASE_EFFECTS: Record<EffectKind, Effect> = {
  modifyStat: { kind: "modifyStat", stat: "armor", flat: 2 },
  damageBonus: { kind: "damageBonus", filter: { kind: "melee" }, percent: 10 },
  flag: { kind: "flag", flag: "guaranteedHit" },
  note: { kind: "note", text: "Просто нотатка" },
  dealDamage: { kind: "dealDamage", amount: "2d6", damageType: "fire" },
  heal: { kind: "heal", amount: 5 },
  dot: { kind: "dot", damagePerRound: 3, damageType: "poison", duration },
  hot: { kind: "hot", healPerRound: 4, duration },
  berserk: { kind: "berserk", damageBonusPercent: 25, duration },
  charm: { kind: "charm", duration },
  applyCondition: { kind: "applyCondition", condition: "stunned", duration },
  grantAction: { kind: "grantAction", extraActions: 1 },
  restoreSpellSlotLevels: { kind: "restoreSpellSlotLevels", budget: 3, maxSlotLevel: 5 },
  restoreSpellSlot: { kind: "restoreSpellSlot", count: 1 },
  drainSpellSlot: { kind: "drainSpellSlot", count: 2 },
  changeMorale: { kind: "changeMorale", delta: -1 },
  mark: { kind: "mark", markId: "prey", duration },
  copySpellBuffs: { kind: "copySpellBuffs" },
  guard: { kind: "guard", percent: 50, duration },
  summon: { kind: "summon", group: "Haven", tier: 2, count: 2 },
  raiseDead: { kind: "raiseDead", hpPercent: 30 },
  cleanse: { kind: "cleanse" },
  maneuver: { kind: "maneuver", maneuver: "dive", percentOfAttack: 150 },
  randomOf: { kind: "randomOf", options: [{ kind: "heal", amount: 3 }, { kind: "dealDamage", amount: 4 }] },
};

const FLAG_OVERRIDES: Partial<Record<FlagKey, Record<string, unknown>>> = {
  castSpellOnHit: { spellIds: ["s1", "s2"] },
  spellAbsorb: { school: "fire" },
};

const FLAG_FIXTURES: Effect[] = (Object.keys(FLAG_REGISTRY) as FlagKey[]).map(
  (flag) => ({ kind: "flag", flag, ...FLAG_REGISTRY[flag].defaults, ...FLAG_OVERRIDES[flag] }) as Effect,
);

const VARIANT_EFFECTS: Effect[] = [
  { kind: "modifyStat", stat: "attackBonus", flat: { formula: "level/2" } },
  { kind: "modifyStat", stat: "maxHp", flat: { scale: "bonus" }, percent: 10 },
  { kind: "modifyStat", stat: "strength", atLeast: 19 },
  { kind: "modifyStat", stat: "spellSlots", flat: 1, spellLevels: [1, 2] },
  { kind: "modifyStat", stat: "speed", flat: -10, percent: { formula: "x" } },
  ...(["ranged", "magic", "physical", "all"] as const).map((kind) => ({ kind: "damageBonus", filter: { kind, school: kind === "magic" ? "fire" : undefined }, flat: 3 }) as Effect),
  { kind: "damageBonus", filter: { kind: "melee" }, flat: 2, perMark: "prey" },
  { kind: "flag", flag: "advantage", attackKind: "melee", attackAbility: "strength", consumeOn: "ownAttack" },
  { kind: "flag", flag: "advantage", attackKind: "ranged" },
  { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 },
  { kind: "flag", flag: "resistance", damageType: "physical", percent: -50, attackKind: "ranged", school: "fire" },
  { kind: "flag", flag: "resistance", damageType: "physical", percent: 25, attackKind: "melee" },
  { kind: "flag", flag: "spellImmunity", spellIds: ["s1"] },
  { kind: "flag", flag: "spellTargeting", mode: "all", school: "fire" },
  { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["s1"], maxTargets: 4 },
  { kind: "flag", flag: "counterAttack", attackKinds: ["melee", "ranged"], bonusPercent: 20 },
  { kind: "flag", flag: "extraSummons", count: 2, spellIds: ["s1"] },
  { kind: "flag", flag: "saveAdvantage", abilities: ["wisdom", "charisma"], vsSpells: true },
  { kind: "flag", flag: "saveDisadvantage", abilities: ["strength"] },
  { kind: "flag", flag: "checkAdvantage", skills: ["stealth", "perception"] },
  { kind: "flag", flag: "proficiency", kinds: ["light", "shield", "martial"] },
  { kind: "flag", flag: "conditionImmunity", conditions: ["fear", "berserk", "charm", "stunned"] },
  { kind: "flag", flag: "minMorale", value: -2 },
  { kind: "flag", flag: "sense", sense: "darkvision", range: 60 },
  { kind: "note", text: "Підкинь кубик DM" },
  { kind: "dealDamage", amount: { scale: "dmg" } },
  { kind: "dealDamage", amount: { formula: "level*2" }, falloff: [100, 50, 25] },
  { kind: "dealDamage", amount: { spellRoll: 100 } },
  { kind: "dealDamage", amount: { spellRoll: 50 } },
  { kind: "dealDamage", amount: { spellRoll: { formula: "x" } } },
  { kind: "dealDamage", amount: { percentOf: "eventDamage", value: 50 } },
  { kind: "dealDamage", amount: { percentOf: "maxHp", value: 10 } },
  { kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 75 } },
  { kind: "heal", amount: "1d8", revive: true },
  ...(["blinded", "exhaustion", "skip_action", "no_bonus_action", "immobilized"] as const).map(
    (condition) => ({ kind: "applyCondition", condition, duration, levels: condition === "exhaustion" ? 2 : undefined, percent: condition === "skip_action" ? 40 : undefined }) as Effect,
  ),
  { kind: "applyCondition", condition: "charmed", duration, breakOnDamage: true, saveEnds: { ability: "wisdom" } },
  { kind: "grantAction", extraActions: 2, refreshAction: true, refreshBonusAction: true, refreshReaction: true },
  { kind: "restoreSpellSlotLevels", budget: { formula: "level" }, maxSlotLevel: 3 },
  { kind: "summon", unitId: "unit-1" },
  { kind: "summon", unitId: "unit-1", count: 3 },
  { kind: "summon", group: "Inferno", tier: 5 },
  { kind: "changeMorale", delta: 2 },
  { kind: "cleanse", includeConditions: true },
  { kind: "maneuver", maneuver: "squall", percentOfAttack: 80 },
  { kind: "maneuver", maneuver: "fireBurst", percentOfAttack: 120 },
];

export const EFFECT_FIXTURES: Effect[] = [...Object.values(BASE_EFFECTS), ...FLAG_FIXTURES, ...VARIANT_EFFECTS];

const isStatic = (e: Effect) => EFFECT_REGISTRY[e.kind].static;

const effectAbility = (e: Effect, i: number): Ability => ({
  id: `effect-${i}-${e.kind}${e.kind === "flag" ? `-${e.flag}` : ""}`,
  name: `Ефект ${i}`,
  trigger: isStatic(e) || e.kind === "restoreSpellSlotLevels" || e.kind === "note" ? { event: "passive" } : { event: "action" },
  effects: [e],
});

const TRIGGER_BASES: Record<Trigger["event"], Trigger> = {
  passive: { event: "passive" },
  battleStart: { event: "battleStart" },
  roundStart: { event: "roundStart" },
  roundEnd: { event: "roundEnd" },
  turnStart: { event: "turnStart" },
  turnEnd: { event: "turnEnd" },
  attack: { event: "attack", phase: "before", role: "attacker" },
  hit: { event: "hit", role: "attacker" },
  kill: { event: "kill", role: "killer" },
  lethalDamage: { event: "lethalDamage" },
  spellCast: { event: "spellCast", phase: "after", role: "caster" },
  moraleCheck: { event: "moraleCheck", result: "fail", whose: "self" },
  bonusAction: { event: "bonusAction" },
  action: { event: "action" },
};

const TRIGGER_VARIANTS: Trigger[] = [
  { event: "attack", phase: "after", role: "target", attackKind: "ranged" },
  { event: "hit", role: "target", whose: "ally", attackKind: "melee" },
  { event: "hit", role: "attacker", whose: "self" },
  { event: "kill", role: "killerSide" },
  { event: "kill", role: "victimSide" },
  { event: "spellCast", phase: "before", role: "target", whose: "ally", spellIds: ["s1", "s2", "s3"], school: "fire", spellLevels: [1, 3] },
  { event: "spellCast", phase: "after", role: "target", whose: "self" },
  { event: "moraleCheck", result: "success", whose: "ally" },
  { event: "moraleCheck", result: "any", whose: "self" },
];

const NOTE: Effect = { kind: "note", text: "x" };

const triggerAbility = (trigger: Trigger, i: number): Ability => ({ id: `trigger-${i}-${trigger.event}`, name: `Тригер ${i}`, trigger, effects: [NOTE] });

const CONDITION_BASES: Record<Condition["type"], Condition> = {
  hpBelow: { type: "hpBelow", who: "self", percent: 50 },
  hpAbove: { type: "hpAbove", who: "eventTarget", percent: 80 },
  attackKind: { type: "attackKind", kind: "magic" },
  targetHasCondition: { type: "targetHasCondition", condition: "stunned" },
  targetCreatureType: { type: "targetCreatureType", types: ["undead", "fiend"] },
  targetRace: { type: "targetRace", races: ["Orc"] },
  targetDead: { type: "targetDead" },
  actorIsEnemy: { type: "actorIsEnemy" },
  hasMark: { type: "hasMark", who: "anyEnemy", markId: "prey", bySelf: true },
  armorWorn: { type: "armorWorn", categories: ["none", "light"], shield: "without" },
  attackRollMode: { type: "attackRollMode", mode: "advantage" },
  allyAdjacent: { type: "allyAdjacent" },
  notMoved: { type: "notMoved" },
  withThisItem: { type: "withThisItem" },
  not: { type: "not", condition: { type: "targetDead" } },
  all: { type: "all", conditions: [{ type: "targetDead" }, { type: "notMoved" }] },
  any: { type: "any", conditions: [{ type: "targetDead" }, { type: "allyAdjacent" }] },
};

const CONDITION_VARIANTS: Condition[] = [
  { type: "hasMark", who: "self", markId: "prey" },
  { type: "armorWorn", categories: ["medium", "heavy"], shield: "with" },
  { type: "attackKind", kind: "melee" },
  { type: "hpBelow", who: "anyAlly", percent: 25 },
];

const conditionAbility = (condition: Condition, i: number): Ability => ({ id: `condition-${i}-${condition.type}`, name: `Умова ${i}`, trigger: { event: "action" }, condition, effects: [NOTE] });

const PLURAL_BOUNDARIES = [1, 2, 5, 11, 21] as const;

const LIMIT_FIXTURES: Limits[] = [
  ...PLURAL_BOUNDARIES.map((n): Limits => ({ perBattle: n })),
  ...PLURAL_BOUNDARIES.map((n): Limits => ({ perRest: { rest: n % 2 ? "short" : "long", uses: n } })),
  { perRest: { rest: "long", uses: { formula: "level/2" } } },
  { perRest: { rest: "short", uses: { scale: "rage" }, shortRegain: 1 } },
  { perRound: 2, perTurn: 1 },
  { perRound: 1 },
  { cooldownRounds: 3, chance: 50 },
  { pool: { key: "ki", cost: 2 } },
  { perBattle: 2, perRest: { rest: "long", uses: 3 }, perRound: 1, perTurn: 1, cooldownRounds: 2, chance: 75, pool: { key: "mana", cost: 5 } },
];

const limitsAbility = (limits: Limits, i: number): Ability => ({ id: `limits-${i}`, name: `Ліміти ${i}`, trigger: { event: "action" }, limits, effects: [NOTE] });

const SPECIAL_ABILITIES: Ability[] = [
  { id: "limits-lair", name: "Лігво", trigger: { event: "action" }, limits: { lair: true }, effects: [NOTE] },
  ...([1, 2, 3] as const).map((legendaryCost): Ability => ({ id: `limits-legendary-${legendaryCost}`, name: `Легендарна ${legendaryCost}`, trigger: { event: "action" }, limits: { legendaryCost }, effects: [NOTE] })),
  {
    id: "combined",
    name: "Комбіноване",
    trigger: { event: "hit", role: "attacker", whose: "ally" },
    condition: { type: "all", conditions: [{ type: "hpBelow", who: "self", percent: 50 }, { type: "not", condition: { type: "targetDead" } }] },
    limits: { perBattle: 3, perTurn: 1 },
    effects: [{ kind: "dealDamage", amount: "1d6", damageType: "fire" }, { kind: "mark", markId: "prey", target: "eventTarget", duration }, { kind: "randomOf", options: [{ kind: "heal", amount: 3 }, { kind: "cleanse" }] }],
  },
];

export const ABILITY_FIXTURES: Ability[] = [
  ...EFFECT_FIXTURES.map(effectAbility),
  ...[...Object.values(TRIGGER_BASES), ...TRIGGER_VARIANTS].map(triggerAbility),
  ...[...Object.values(CONDITION_BASES), ...CONDITION_VARIANTS].map(conditionAbility),
  ...LIMIT_FIXTURES.map(limitsAbility),
  ...SPECIAL_ABILITIES,
];

export const LIMITS_FIXTURES = LIMIT_FIXTURES;

export const REGISTRY_COVERAGE = {
  effectKinds: Object.keys(EFFECT_REGISTRY) as EffectKind[],
  flagKeys: Object.keys(FLAG_REGISTRY) as FlagKey[],
  triggerEvents: Object.keys(TRIGGER_REGISTRY) as Trigger["event"][],
  conditionTypes: Object.keys(CONDITION_REGISTRY) as Condition["type"][],
  conditionKeys: [...CONDITION_KEYS, ...CONDITION_5E_KEYS],
};
