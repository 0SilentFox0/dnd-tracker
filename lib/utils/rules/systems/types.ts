import type { CharacteristicKey, Characteristics } from "./wfrp/characteristics/keys";
import type { HitLocation } from "./wfrp/combat/constants";
import type { WfrpParticipantStats } from "./wfrp/combat/participant";

import type { RuleSystemKey } from "@/lib/constants/rules";
import type { Translator } from "@/lib/i18n/translator";
import type { DamageConsequencesInput, DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { MechanicKey } from "@/lib/utils/rules/registry";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { ActiveEffect, BattleAttack, BattleParticipant } from "@/types/battle";
import type { CharacterResources, SheetRollBody, SheetRollResult } from "@/types/characters";
import type { LogLine } from "@/types/text";

export type { RuleSystemKey };

export interface CharacterHpInput {
  level: number;
  constitution: number;
  archetype?: string | null;
}

export interface SheetBlockInput {
  characteristics: Characteristics;
  resources: CharacterResources;
}

export interface SheetWfrpBlock {
  characteristics: { key: CharacteristicKey; base: number; advances: number; value: number; bonus: number }[];
  wounds: { max: number; breakdown: HpBreakdownLine[] };
  move: { value: number; walkYd: number; runYd: number };
  skills: { key: string; spec?: string; characteristic: CharacteristicKey; target: number; advances: number; trained: boolean; kind: "basic" | "advanced" }[];
  fate: number;
  fortune: number;
}

export interface SheetTestInput {
  participant: BattleParticipant;
  character: { characteristics?: unknown };
  body: SheetRollBody;
  rules: Ruleset;
  rng: Rng;
  inspiration: boolean;
  t: Translator;
  presetRoll?: number;
}

export type SheetTestResult = SheetRollResult;

export type FortuneKind = "reroll" | "sl";

export interface ResolveAttackCtx {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  participants: BattleParticipant[];
  rules: Ruleset;
  rng: Rng;
  manualRoll?: number;
  momentum: { attacker: boolean; defender: boolean };
  fortune?: { kind: FortuneKind; manualReroll?: number };
}

export interface ResolvedAttack {
  isHit: boolean;
  attackRoll: AttackRollResult;
  netSl: number;
  location: HitLocation;
  momentum: { spent: boolean; gainedBy: "attacker" | "defender" | null };
  /** Only when Fortune actually took effect */
  fortune?: { kind: FortuneKind; firstRoll?: number };
  fortuneLine?: LogLine;
}

export interface DamageStep {
  key: string;
  value: number;
}

export interface MitigateCtx {
  attacker: BattleParticipant;
  target: BattleParticipant;
  /** Rolled weapon damage (dice + flat bonus), before the system's own modifiers */
  weapon: number;
  /** d20-pipeline damage after resistance; 0 means the target is immune */
  amount: number;
  netSl: number;
  location: HitLocation;
  /** The attack roll was a critical (WFRP: doubles on a hit) */
  crit: boolean;
  rng: Rng;
  rules: Ruleset;
}

export interface MitigateResult {
  amount: number;
  steps: DamageStep[];
  /** Follow-up applied to the target after the hit (e.g. a WFRP critical wound) */
  afterHit?(target: BattleParticipant, round: number): { participant: BattleParticipant; message: LogLine };
}

export type ZeroHpCtx = DamageConsequencesInput & { rules: Ruleset; manual?: boolean };

export interface InitiativeScore {
  total: number;
  roll: number | null;
  die: number | null;
}

export interface SystemConditionInfo {
  key: string;
  maxLevel: number | null;
  endTest: "roll" | "stand" | null;
  timed: boolean;
  /** i18n key */
  label: string;
}

export interface SystemConditionApply {
  key: string;
  levels?: number;
  rounds?: number;
  round: number;
  source?: ActiveEffect["source"];
  sourceName: LogLine;
}

export interface SystemConditionResult {
  participants: BattleParticipant[];
  messages: LogLine[];
}

export interface SystemConditionLevel {
  key: string;
  level: number;
  effectKey: string;
}

export interface RuleSystemConditions {
  catalog: readonly SystemConditionInfo[];
  /** Strips what a viewer must not learn about a target from a log line */
  concealLine(line: LogLine): LogLine;
  list(p: BattleParticipant): SystemConditionLevel[];
  apply(ps: BattleParticipant[], targetId: string, input: SystemConditionApply): SystemConditionResult;
  reduce(ps: BattleParticipant[], targetId: string, key: string, by: 1 | "all"): SystemConditionResult & { removed: boolean };
  turnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences }): SystemConditionResult & { downed: boolean };
  /** Called when a downed participant's turn is skipped (e.g. WFRP bleeding out) */
  skippedTurn?(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng }): SystemConditionResult;
  /** Downed allies stay at 0 HP after a victory (healing raises them) */
  keepDownedAfterVictory?: true;
  attemptEnd(
    ps: BattleParticipant[],
    id: string,
    key: string,
    ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number },
  ): SystemConditionResult & { success: boolean };
}

export interface RuleSystemCombat {
  fortune?: true;
  dice: 20 | 100;
  participantFields?(row: { characteristics?: unknown }): { characteristics: Characteristics; wfrp: WfrpParticipantStats };
  actionEconomy: { bonusAction: boolean; reaction: boolean };
  resolveAttack?(ctx: ResolveAttackCtx): ResolvedAttack;
  /** Characteristic and base target an attack is rolled against, before situational modifiers (percentile systems only) */
  attackTarget?(attacker: BattleParticipant, attack: BattleAttack): { characteristic: CharacteristicKey; target: number };
  mitigateDamage?(ctx: MitigateCtx): MitigateResult;
  onZeroHp?(ctx: ZeroHpCtx): DamageConsequencesResult;
  /** Base score before flat modifiers; `roll`/`die` are null when nothing was rolled (static mode, pinned) */
  initiative?(p: BattleParticipant, ctx: { rules: Pick<Ruleset, "initiative">; rng: Rng }): InitiativeScore;
  /** Starting values the participant builders use instead of the d20 sheet columns */
  baseStats?(row: { characteristics?: unknown }): { initiative: number; speed: number };
  /** Balance: hit chance from offense/defense numbers (instead of d20 to-hit vs AC) and expected damage per hit against a reference target */
  hitModel?: {
    offense(p: BattleParticipant): number;
    defense(p: BattleParticipant): number;
    winChance(off: number, def: number): number;
    damage(p: BattleParticipant): number;
    /** Hit chance of an average matchup; party/unit factors are relative to it */
    refHit: number;
  };
}

export interface RuleSystemDefinition {
  key: RuleSystemKey;
  distance: { unit: "ft" | "yd"; perCell: number };
  balance: { kind: "fair" } | { kind: "none" };
  progression: {
    levels: boolean;
    maxHp(input: { character: CharacterHpInput; characteristics: Characteristics; rules: Ruleset }): { total: number; breakdown: HpBreakdownLine[] } | null;
  };
  characteristics: { kind: "d20" | "wfrp"; sheetBlock(input: SheetBlockInput): SheetWfrpBlock | undefined };
  sheetTest: { accepts(body: { kind: string }): boolean; roll(input: SheetTestInput): SheetTestResult };
  rest: { kinds: boolean; onSession?(resources: CharacterResources, characteristics: Characteristics): CharacterResources };
  battle: { supported: boolean };
  combat: RuleSystemCombat;
  conditions?: RuleSystemConditions;
  lineage: boolean;
  classes: boolean;
  attacks: boolean;
  spells: boolean;
  items: boolean;
  d20Stats: boolean;
  unusedMechanics: readonly MechanicKey[];
}

export type ApplyDamageConsequences = typeof import("@/lib/utils/battle/damage/consequences").applyDamageConsequences;
