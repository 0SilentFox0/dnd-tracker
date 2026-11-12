import type { SystemData, SystemSlot } from "./slot";

import type { Coin } from "@/lib/constants/inventory";
import type { Translator } from "@/lib/i18n/translator";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { Condition5eKey } from "@/lib/utils/abilities/schema/kinds";
import type { Recipe } from "@/lib/utils/abilities/templates/types";
import type { LabeledEffectInput } from "@/lib/utils/battle/actions/effects";
import type { RollMode } from "@/lib/utils/battle/attack/bonus";
import type { ApplyConditionOptions, ApplyConditionResult, ConditionEffectOptions } from "@/lib/utils/battle/conditions/set";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import type { DamageConsequencesInput, DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import type { DieFx } from "@/lib/utils/battle/fx/dice/types";
import type { EquippedArtifactRow } from "@/lib/utils/battle/participant/extract-artifacts";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ExtractedAttack } from "@/lib/utils/battle/types/participant";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { ChoiceGroup } from "@/lib/utils/characters/choices/selections";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { SpellMagic, SpellMagicKind } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { CharacterResources, SheetRollBody, SheetRollResult } from "@/types/characters";
import type { FeatData } from "@/types/choices";
import type { LogLine, TextRef } from "@/types/text";

export interface CharacterHpInput {
  level: number;
  constitution: number;
  archetype?: string | null;
}

export interface SheetBlockInput {
  characteristics: unknown;
  resources: CharacterResources;
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
  /** Scene-level state of the system, as the previous attack left it */
  sceneState?: SystemSlot;
  fortune?: { kind: FortuneKind; manualReroll?: number };
  /** Player-side dice and options of an attack made on the actor's turn */
  roll?: { advantage?: number; disadvantage?: number; mode?: RollMode; inspiration?: boolean };
  /** Modifiers of the action events fired before the attack, by participant id */
  modifiers?: Record<string, StaticEffect[]>;
  map?: BattleMapConfig | null;
  crit?: CritPicker;
  /** Server-rolled strike outside the actor's turn (retaliation, opportunity, readied, legendary) */
  offTurn?: { noun: TextRef };
}

export interface ResolvedAttack {
  isHit: boolean;
  /** margin, location and system carry the test details */
  attackRoll: AttackRollResult;
  /** Written to actionDetails.targetAC (0 when there is no defence value) */
  defenseValue?: number;
  /** Test lines for the log */
  lines: LogLine[];
  /** Next scene state; absent = unchanged */
  scene?: SystemSlot;
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
  margin: number;
  location: string;
  /** The attack roll was a critical (a system may double damage on a hit) */
  crit: boolean;
  attackRoll?: number;
  attack: BattleAttack;
  rng: Rng;
  rules: Ruleset;
}

export interface MitigateResult {
  amount: number;
  steps: MitigateStep[];
  totalLabel: LogLine;
  /** Follow-up applied to the target after the hit (e.g. a critical wound) */
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
  /** Called when a downed participant's turn is skipped (e.g. bleeding out) */
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

/** Standard conditions (blinded, prone, exhaustion…) that core rules apply; unlike `conditions`, every base provides it */
export interface RuleSystemConditionSet {
  /** `blocked`: the target is immune, or the system has no such condition */
  apply(ps: BattleParticipant[], targetId: string, opts: ApplyConditionOptions): ApplyConditionResult;
  /** null: the system has no such condition */
  effectInput(key: Condition5eKey, opts: ConditionEffectOptions): LabeledEffectInput | null;
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

export interface CastTestResult {
  success: boolean;
  margin: number;
  overcastSteps: number;
  miscast: string | null;
  /** Prayers neither use nor spend banked channelling */
  keepChannelled?: true;
  details: SystemSlot;
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
  miscast(ps: BattleParticipant[], casterId: string, kind: string, ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences; presetRoll?: number }): SystemConditionResult;
  attribute(ps: BattleParticipant[], targetIds: string[], magic: SpellMagic, round: number): SystemConditionResult;
  /** Token badge for banked channelling */
  badge(p: BattleParticipant): ActiveEffect | null;
  /** Channelled SL lost when the caster takes damage */
  onDamaged(p: BattleParticipant): BattleParticipant;
}

export interface ActionDetailsView {
  hideNumbers: boolean;
  hideActor: boolean;
}

export interface RuleSystemActionDetails {
  /** Same reference when nothing is hidden; undefined drops the slot */
  redact(details: SystemSlot, view: ActionDetailsView): SystemSlot | undefined;
  /** Details reveal something only the actor's side may see (a miscast) */
  actorSecret(details: SystemSlot): boolean;
  /** Applied to every line a player receives; idempotent */
  redactLine(line: LogLine): LogLine;
  /** One group of one throw; [] when nothing was thrown */
  diceFx(details: SystemSlot): DieFx[];
  /** The cast did not take effect */
  failed(details: SystemSlot): boolean;
}

export interface RuleSystemCombat {
  details?: RuleSystemActionDetails;
  fortune?: true;
  /** Who judges an attack: the client rolls and the server checks vs AC, or the server resolves the whole test */
  judge: "client" | "server";
  dice: number;
  attacksOf?(input: { rows: EquippedArtifactRow[] }): ExtractedAttack[];
  participantFields?(row: { characteristics?: unknown }, gear?: ArmourGear): SystemSlot;
  /** Ranks participants with equal initiative: higher wins */
  tieBreak?(p: BattleParticipant): number;
  actionEconomy: { bonusAction: boolean; reaction: boolean };
  resolveAttack(ctx: ResolveAttackCtx): ResolvedAttack;
  /** The roll recorded for an attack that never happened (the target or the attacker dropped out first) */
  abortedRoll(ctx: ResolveAttackCtx): AttackRollResult;
  /** Characteristic and base target an attack is rolled against, before situational modifiers (percentile systems only) */
  attackTarget?(attacker: BattleParticipant, attack: BattleAttack): { label: LogLine; target: number };
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
  key: string;
  progression: {
    levels: boolean;
    maxHp(input: { character: CharacterHpInput; characteristics: unknown; rules: Ruleset }): { total: number; breakdown: HpBreakdownLine[] } | null;
    hpTerm: "hp" | "wounds";
  };
  characteristics: {
    /** The `characteristics` column carries system data (otherwise it is dropped on write) */
    persisted: boolean;
    defaults(): SystemData | undefined;
    isEmpty(value: unknown): boolean;
    sheetBlock(input: SheetBlockInput): SystemSlot | undefined;
    /** Merges an incoming edit into the stored value; throws ContentError on a conflict */
    reconcile?(stored: unknown, incoming: unknown, ctx: { isDM: boolean; baseline?: unknown }): unknown;
    /** Drops server-owned fields from the blob of a newly created character */
    initial?(value: SystemData): SystemData;
    redact?(value: unknown, viewer: { isDM: boolean; isOwner: boolean }): unknown;
  };
  resources?: {
    limits?(row: { characteristics?: unknown }): { fateMax?: number };
    seed?(characteristics: unknown): Partial<CharacterResources>;
    /** Starting Fortune of a participant without stored resources */
    fortuneOf?(p: BattleParticipant): number | undefined;
  };
  sheetTest: { accepts(body: { kind: string }): boolean; roll(input: SheetTestInput): SheetTestResult };
  rest: { kinds: boolean; onSession?(resources: CharacterResources, characteristics: unknown): CharacterResources };
  combat: RuleSystemCombat;
  conditionSet: RuleSystemConditionSet;
  conditions?: RuleSystemConditions;
  magic?: RuleSystemMagic;
  advancement?: RuleSystemAdvancement;
  equipment?: RuleSystemEquipment;
  traits?: RuleSystemTraits;
  currency?: RuleSystemCurrency;
  /** Presence flags: the UI shows the tab; the handlers live in the system */
  downtime?: true;
  corruption?: true;
  identity: { alignments: boolean };
  creation?: true;
  lineage: boolean;
  classes: boolean;
  attacks: boolean;
  spells: boolean;
  items: boolean;
  inventory: boolean;
  d20Stats: boolean;
}

export interface ArmourGear {
  ap: Record<string, number>;
  armourOnly?: Record<string, number>;
  flexible?: boolean;
}

export interface UnitBuild {
  fields: SystemSlot;
  attacks: ExtractedAttack[];
}

export interface RuleSystemTraits {
  recipes: readonly Recipe[];
  unitBuild(row: { id: string; characteristics?: unknown }, abilities: readonly ResolvedAbility[]): UnitBuild;
  psychology?(ps: BattleParticipant[], ctx: { round: number; rng: Rng; map?: BattleMapConfig | null; newcomerIds?: readonly string[] }): SystemConditionResult & { testerIds: string[] };
}

export interface RuleSystemAdvancement {
  talentsOf(row: { characteristics?: unknown }): Record<string, number>;
  talentGroups(talents: Record<string, number>, featsById: Record<string, FeatData>): ChoiceGroup[];
}

export type ApplyDamageConsequences = typeof import("@/lib/utils/battle/damage/consequences").applyDamageConsequences;

export interface RuleSystemCurrency {
  coins: readonly Coin[];
  value: Record<Coin, number>;
  labelKeys: Record<Coin, string>;
}

export interface RuleSystemEquipment {
  armourAp(equipped: { slot: string; systemStats: unknown }[]): ArmourGear;
}
