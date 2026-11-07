import type { planCareerAdvance, planCareerSet } from "./wfrp/advancement/career";
import type { advanceCost } from "./wfrp/advancement/cost";
import type { planPurchase } from "./wfrp/advancement/plan";
import type { availableXp, talentGroups } from "./wfrp/advancement/talent-groups";
import type { planUndo } from "./wfrp/advancement/undo";
import type { CharacteristicKey, Characteristics } from "./wfrp/characteristics/keys";
import type { HitLocation } from "./wfrp/combat/constants";
import type { WfrpParticipantStats } from "./wfrp/combat/participant";
import type { planDraft } from "./wfrp/creation/plan";
import type { isUsableProfile } from "./wfrp/creation/profile";
import type { rollCreation } from "./wfrp/creation/roll";
import type { armourAp, parseWfrpStats } from "./wfrp/equipment/armour";
import type { encumbrance } from "./wfrp/equipment/encumbrance";
import type { QUALITY_REGISTRY, QualityRef } from "./wfrp/equipment/qualities";
import type { PercentileOutcome } from "./wfrp/percentile";
import type { wfrpUnitBuild } from "./wfrp/traits/unit-build";

import type { Coin } from "@/lib/constants/inventory";
import type { RuleSystemKey } from "@/lib/constants/rules";
import type { Translator } from "@/lib/i18n/translator";
import type { Recipe } from "@/lib/utils/abilities/templates/types";
import type { DamageConsequencesInput, DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import type { AttackRollResult, PercentileCastDetails } from "@/lib/utils/battle/types/attack";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { MechanicKey } from "@/lib/utils/rules/registry";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { SpellMagic, SpellMagicKind } from "@/lib/utils/spells/model/schema";
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
  sin: number;
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

export interface MitigateStep {
  key: string;
  value: number;
  label: LogLine;
  side: "attacker" | "target";
}

export interface MitigateCtx {
  attacker: BattleParticipant;
  target: BattleParticipant;
  /** Rolled weapon damage (dice + flat bonus), before the system's own modifiers */
  weapon: number;
  /** 0 means the target is immune (d20 damage was resisted to nothing); otherwise positive, weapon damage is in `weapon` */
  amount: number;
  netSl: number;
  location: HitLocation;
  /** The attack roll was a critical (WFRP: doubles on a hit) */
  crit: boolean;
  attackRoll?: number;
  qualities?: QualityRef[];
  flaws?: QualityRef[];
  /** WFRP weapon without the Strength bonus */
  noSb?: boolean;
  rng: Rng;
  rules: Ruleset;
}

export interface MitigateResult {
  amount: number;
  steps: MitigateStep[];
  totalLabel: LogLine;
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
  concealed?: true;
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
  /** Lines that reveal a caster's miscast; dropped for players when the caster is not visible to them */
  isMiscastLine?(line: LogLine): boolean;
  list(p: BattleParticipant): SystemConditionLevel[];
  apply(ps: BattleParticipant[], targetId: string, input: SystemConditionApply): SystemConditionResult;
  reduce(ps: BattleParticipant[], targetId: string, key: string, by: 1 | "all"): SystemConditionResult & { removed: boolean };
  turnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences }): SystemConditionResult & { downed: boolean };
  /** Called when a downed participant's turn is skipped (e.g. WFRP bleeding out) */
  skippedTurn?(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng }): SystemConditionResult;
  /** Downed allies stay at 0 HP after a victory (healing raises them) */
  keepDownedAfterVictory?: true;
  /** Effects that survive a participant going UNCONSCIOUS (cleared on death) */
  keepsWhenDown?(effect: ActiveEffect): boolean;
  attemptEnd(
    ps: BattleParticipant[],
    id: string,
    key: string,
    ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number },
  ): SystemConditionResult & { success: boolean };
}

export interface CastTestCtx {
  caster: BattleParticipant;
  spell: CastableSpell;
  magic: SpellMagic;
  rules: Ruleset;
  rng: Rng;
  presetRoll?: number;
  fortune?: { kind: FortuneKind; manualReroll?: number };
}

export type MiscastKind = "minor" | "major" | "wrath";

export interface CastTestResult {
  success: boolean;
  sl: number;
  overcastSteps: number;
  miscast: MiscastKind | null;
  /** Prayers neither use nor spend banked channelling */
  keepChannelled?: true;
  percentile: PercentileCastDetails & { outcome: PercentileOutcome };
  lines: LogLine[];
  fortune?: { kind: FortuneKind; firstRoll?: number };
}

export interface RuleSystemMagic {
  slots: false;
  /** Ingredients are optional: spending one cancels the miscast instead of gating the cast */
  ingredients?: "avertMiscast";
  /** Drops the miscast of a cast that used an ingredient */
  avertMiscast(cast: CastTestResult, who: { name: string; spell: string }): CastTestResult;
  castTest(ctx: CastTestCtx): CastTestResult;
  /** Numbers a caster sees before rolling: casting and channelling targets, banked SL and armour penalty */
  castPreview(caster: BattleParticipant, kind?: SpellMagicKind): { target: number; channelTarget: number; channelled: number; armourSl: number };
  channel(p: BattleParticipant, ctx: { rules: Ruleset; rng: Rng; presetRoll?: number }): { participant: BattleParticipant; lines: LogLine[]; miscast: "minor" | "major" | null };
  miscast(ps: BattleParticipant[], casterId: string, kind: MiscastKind, ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences; presetRoll?: number }): SystemConditionResult;
  attribute(ps: BattleParticipant[], targetIds: string[], magic: SpellMagic, round: number): SystemConditionResult;
  /** Token badge for banked channelling */
  badge(p: BattleParticipant): ActiveEffect | null;
  /** Channelled SL lost when the caster takes damage */
  onDamaged(p: BattleParticipant): BattleParticipant;
}

export interface RuleSystemCombat {
  fortune?: true;
  dice: 20 | 100;
  participantFields?(row: { characteristics?: unknown }, gear?: { ap: Record<HitLocation, number>; armourOnly?: Record<HitLocation, number>; flexible?: boolean }): { characteristics: Characteristics; wfrp: WfrpParticipantStats };
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
    /** Multiplier on effective HP for protection that offense/defense do not capture (armour, ward) */
    durability?(p: BattleParticipant): number;
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
  magic?: RuleSystemMagic;
  advancement?: RuleSystemAdvancement;
  equipment?: RuleSystemEquipment;
  traits?: RuleSystemTraits;
  currency?: RuleSystemCurrency;
  identity: { alignments: boolean };
  creation?: RuleSystemCreation;
  lineage: boolean;
  classes: boolean;
  attacks: boolean;
  spells: boolean;
  items: boolean;
  inventory: boolean;
  d20Stats: boolean;
  unusedMechanics: readonly MechanicKey[];
}

export interface RuleSystemTraits {
  recipes: readonly Recipe[];
  unitBuild: typeof wfrpUnitBuild;
  psychology?(ps: BattleParticipant[], ctx: { round: number; rng: Rng; newcomerIds?: readonly string[] }): SystemConditionResult & { testerIds: string[] };
}

export interface RuleSystemAdvancement {
  cost: typeof advanceCost;
  planPurchase: typeof planPurchase;
  planUndo: typeof planUndo;
  planCareerSet: typeof planCareerSet;
  planCareerAdvance: typeof planCareerAdvance;
  availableXp: typeof availableXp;
  talentGroups: typeof talentGroups;
}

export interface RuleSystemCreation {
  rollCreation: typeof rollCreation;
  planDraft: typeof planDraft;
  isUsableProfile: typeof isUsableProfile;
}

export type ApplyDamageConsequences = typeof import("@/lib/utils/battle/damage/consequences").applyDamageConsequences;

export type WeaponProfile = {
  range: "melee" | "ranged";
  /** Melee reach in cells */
  cells?: number;
  rangeFt?: number;
  damageFlat: number;
  addSb: boolean;
  qualities: QualityRef[];
  flaws: QualityRef[];
  ammoCapacity?: number;
  twoHanded: boolean;
};

export interface RuleSystemCurrency {
  coins: readonly Coin[];
  value: Record<Coin, number>;
  labelKeys: Record<Coin, string>;
}

export interface RuleSystemEquipment {
  armourAp: typeof armourAp;
  parseStats: typeof parseWfrpStats;
  weaponProfile(stats: unknown): WeaponProfile | null;
  qualities: typeof QUALITY_REGISTRY;
  encumbrance: typeof encumbrance;
}
