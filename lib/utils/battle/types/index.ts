/**
 * Реекспорт типів battle
 */

export type { AttackResult, AttackRollResult } from "./attack";
export type { ProcessAttackParams, ProcessAttackResult } from "./attack-process";
export type {
  ComputeDamageBreakdownParams,
  DamageBreakdownMultiTargetResult,
  DamageBreakdownResult,
  DamageBreakdownTargetResult,
} from "./damage-breakdown";
export type { DamageCalculationResult } from "./damage-calculations";
export type {
  ArtifactModifier,
  CampaignSpellContext,
  CharacterFromPrisma,
  ExtractedAttack,
  UnitFromPrisma,
} from "./participant";
export type {
  BattleSpell,
  ProcessSpellParams,
  ProcessSpellResult,
} from "./spell-process";
