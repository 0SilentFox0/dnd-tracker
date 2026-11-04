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
import type { BattleAttack, BattleParticipant } from "@/types/battle";
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

export interface ResolveAttackCtx {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  participants: BattleParticipant[];
  rules: Ruleset;
  rng: Rng;
  manualRoll?: number;
  momentum: { attacker: boolean; defender: boolean };
}

export interface ResolvedAttack {
  isHit: boolean;
  attackRoll: AttackRollResult;
  netSl: number;
  location: HitLocation;
  momentum: { spent: boolean; gainedBy: "attacker" | "defender" | null };
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

export interface RuleSystemCombat {
  dice: 20 | 100;
  participantFields?(row: { characteristics?: unknown }): { characteristics: Characteristics; wfrp: WfrpParticipantStats };
  actionEconomy: { bonusAction: boolean; reaction: boolean };
  resolveAttack?(ctx: ResolveAttackCtx): ResolvedAttack;
  mitigateDamage?(ctx: MitigateCtx): MitigateResult;
  onZeroHp?(ctx: ZeroHpCtx): DamageConsequencesResult;
  initiative?(p: BattleParticipant, ctx: { rules: Ruleset; rng: Rng }): { total: number; roll: number | null; die: number };
  hitModel?: { offense(p: BattleParticipant): number; defense(p: BattleParticipant): number; winChance(off: number, def: number): number };
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
  lineage: boolean;
  attacks: boolean;
  spells: boolean;
  items: boolean;
  d20Stats: boolean;
  unusedMechanics: readonly MechanicKey[];
}
