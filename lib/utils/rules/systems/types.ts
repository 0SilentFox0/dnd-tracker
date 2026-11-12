import type { SystemData, SystemSlot } from "./slot";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { Coin } from "@/lib/constants/inventory";
import type { Translator } from "@/lib/i18n/translator";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { Condition5eKey } from "@/lib/utils/abilities/schema/kinds";
import type { Recipe } from "@/lib/utils/abilities/templates/types";
import type { LabeledEffectInput } from "@/lib/utils/battle/actions/effects";
import type { CoreActionDef, CoreActionKey } from "@/lib/utils/battle/actions/keys";
import type { CoreActionAvailability, LegendaryAttackInput, LegendaryAttackResult, MovementInput, MovementResult, RunCoreActionInput, RunCoreActionResult } from "@/lib/utils/battle/actions/types";
import type { RollMode } from "@/lib/utils/battle/attack/bonus";
import type { ApplyConditionOptions, ApplyConditionResult, ConditionEffectOptions } from "@/lib/utils/battle/conditions/set";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import type { DamageConsequencesInput, DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import type { DieFx } from "@/lib/utils/battle/fx/dice/types";
import type { EquippedArtifactRow } from "@/lib/utils/battle/participant/extract-artifacts";
import type { RuleSystemProficiency, RuleSystemSaves } from "@/lib/utils/battle/saves/types";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { ExtractedAttack } from "@/lib/utils/battle/types/participant";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { ChoiceGroup } from "@/lib/utils/characters/choices/selections";
import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { SpellMagic, SpellMagicKind } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleAction, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";
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

export type SystemInputCtx =
  | { kind: "attack"; actor: BattleParticipant; targetCount: number }
  | {
      kind: "cast";
      actor: BattleParticipant;
      /** A cast outside the cost rules (DM-granted) */
      free: boolean;
      tested: boolean;
    };

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
  /** The system's own input of the request, parsed by `SystemServer.schemas.attackInput` */
  system?: SystemSlot;
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
  /** Battle data the attacker ends with, merged by the pipeline (a spent resource) */
  attackerData?: Partial<BattleParticipant["battleData"]>;
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

export interface DamageCtx {
  rules: Ruleset;
  crit: boolean;
  hit?: Omit<MitigateCtx, "rules" | "crit">;
}

export interface DamageResult {
  doubleDice: boolean;
  mitigated?: MitigateResult;
}

export type ZeroHpCtx = DamageConsequencesInput & { rules: Ruleset; manual?: boolean };

/** Runs after `onZeroHp`, folding over its result: what else a blow does to the target (breaks concentration, drops a bank) */
export type DamagedHook = (ctx: ZeroHpCtx, result: DamageConsequencesResult) => DamageConsequencesResult;

export interface TurnHookCtx {
  participants: BattleParticipant[];
  round: number;
  rng: Rng;
  rules: Ruleset;
  map?: BattleMapConfig | null;
}

export interface TurnSubjectCtx extends TurnHookCtx {
  id: string;
}

export interface TurnStartCtx extends TurnSubjectCtx {
  applyDamage: ApplyDamageConsequences;
}

export interface TurnJoinCtx extends TurnHookCtx {
  newcomerIds?: readonly string[];
}

export interface TurnAdvanceCtx extends TurnHookCtx {
  scene: BattleSceneState;
}

export interface TurnHookResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  actions?: BattleAction[];
  /** The turn of the subject is skipped: the list stops here */
  skipTurn?: true;
  /** The turn waits for a decision: the list stops here */
  pending?: true;
  /** onTurnStart: the subject went down */
  downed?: boolean;
  /** onJoin: who was tested */
  testerIds?: string[];
}

export type TurnHook<C extends TurnHookCtx = TurnHookCtx> = (ctx: C) => TurnHookResult;

/** Hook lists run in order, base first, then modules (`runTurnHooks`) */
export interface RuleSystemTurn {
  /** Before the turn passes on; core runs its own pending morale check ahead of these */
  beforeAdvance?: readonly TurnHook<TurnAdvanceCtx>[];
  onTurnStart?: readonly TurnHook<TurnStartCtx>[];
  /** A downed participant's turn comes up and is skipped */
  onSkippedTurn?: readonly TurnHook<TurnSubjectCtx>[];
  /** The subject's turn ends, after its save-ends rolls and before effect durations count down */
  onTurnEnd?: readonly TurnHook<TurnSubjectCtx>[];
  /** A new round begins, after the round-start abilities; messages go to the round log */
  onRoundStart?: readonly TurnHook<TurnHookCtx>[];
  /** Participants enter the fight (start, reveal, summon, late join) */
  onJoin?: readonly TurnHook<TurnJoinCtx>[];
}

/** Core actions (dash, grapple, …), movement and legendary strikes; a system without them answers with `noActions` */
export interface RuleSystemActions {
  /** The rules' `actions` section is switched on */
  enabled(rules: Ruleset): boolean;
  catalog: Partial<Record<CoreActionKey, CoreActionDef>>;
  cost(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[]): CoreActionDef["cost"];
  targets(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined): BattleParticipant[];
  available(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined, rules: Ruleset): CoreActionAvailability;
  /** Standing up from prone is possible with the movement left */
  canStandUp(p: BattleParticipant, rules: Ruleset): boolean;
  run(input: RunCoreActionInput): RunCoreActionResult;
  legendaryAttack(input: LegendaryAttackInput): LegendaryAttackResult;
  /** A move with whatever it provokes (opportunity strikes, dragging a grappled foe) */
  move(input: MovementInput): MovementResult;
  /** Drops holds whose grappler fell or is no longer adjacent; same array when there are none */
  releaseInvalidGrapples(ps: BattleParticipant[], map?: BattleMapConfig | null): { participants: BattleParticipant[]; messages: LogLine[] };
}

export interface RuleSystemReactions {
  /** Why the participant cannot react now; null when it can */
  blocker(p: BattleParticipant): LogLine | null;
}

export interface AfterAttackCtx {
  participants: BattleParticipant[];
  attackerId: string;
  defenderId: string;
  criticalEffect?: CriticalEffect;
  /** First strike of the volley */
  first: boolean;
  round: number;
  rules: Ruleset;
  sceneState?: SystemSlot;
  /** The target's answer to this strike (core retaliation); `provoked` skips the reaction accounting */
  retaliate(provoked: boolean, from?: { participants: BattleParticipant[]; sceneState?: SystemSlot }): AfterAttackResult | null;
}

export interface AfterAttackResult {
  participants: BattleParticipant[];
  actions: BattleAction[];
  sceneState?: SystemSlot;
  /** The strike has answered itself: core skips its own retaliation */
  handled?: true;
}

/** Runs after a strike resolved (`runAfterAttack`); null = nothing to add */
export type AfterAttackHook = (ctx: AfterAttackCtx) => AfterAttackResult | null;

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
  /** The system's own input of the request, parsed by `SystemServer.schemas.castInput` */
  system?: SystemSlot;
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
  /** Battle data the caster ends with, merged by the pipeline (a spent resource) */
  casterData?: Partial<BattleParticipant["battleData"]>;
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
  /** Validates the system's input of an attack or a cast before it runs */
  input?: { assert(system: SystemSlot, ctx: SystemInputCtx): void };
  /** Who judges an attack: the client rolls and the server checks vs AC, or the server resolves the whole test */
  judge: "client" | "server";
  dice: number;
  attacksOf?(input: { rows: EquippedArtifactRow[] }): ExtractedAttack[];
  participantFields?(row: { characteristics?: unknown }, gear?: ArmourGear): SystemSlot;
  /** Ranks participants with equal initiative: higher wins */
  tieBreak(p: BattleParticipant): number;
  actionEconomy: { bonusAction: boolean; reaction: boolean };
  resolveAttack(ctx: ResolveAttackCtx): ResolvedAttack;
  /** The roll recorded for an attack that never happened (the target or the attacker dropped out first) */
  abortedRoll(ctx: ResolveAttackCtx): AttackRollResult;
  /** Characteristic and base target an attack is rolled against, before situational modifiers (percentile systems only) */
  attackTarget?(attacker: BattleParticipant, attack: BattleAttack): { label: LogLine; target: number };
  /** Crit-dice rule and, when `ctx.hit` is set, the system's own damage mitigation of that hit */
  damage(ctx: DamageCtx): DamageResult;
  /** Falling to 0 HP (dying, death, unconsciousness); `ctx.manual` is a DM status change settled the same way */
  onZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult;
  onDamaged?: readonly DamagedHook[];
  turn?: RuleSystemTurn;
  actions: RuleSystemActions;
  reactions: RuleSystemReactions;
  saves: RuleSystemSaves;
  proficiency: RuleSystemProficiency;
  /** Hooks after each strike of an attack, base first, then modules */
  afterAttack?: readonly AfterAttackHook[];
  /** Base score before flat modifiers; `roll`/`die` are null when nothing was rolled (static mode, pinned) */
  initiative(p: BattleParticipant, ctx: { rules: Pick<Ruleset, "initiative">; rng: Rng }): InitiativeScore;
  /** Starting values the participant builders use instead of the d20 sheet columns */
  baseStats?(row: { characteristics?: unknown }): { initiative: number; speed: number };
  /** Balance: hit chance from offense/defense numbers (instead of d20 to-hit vs AC) and expected damage per hit against a reference target */
  hitModel: {
    offense(p: BattleParticipant): number;
    defense(p: BattleParticipant): number;
    winChance(off: number, def: number): number;
    damage(p: BattleParticipant): number;
    /** Multiplier on effective HP for protection that offense/defense do not capture (armour, ward) */
    durability?(p: BattleParticipant): number;
    /** Hit chance of an average matchup; party/unit factors are relative to it */
    refHit: number;
    /** Reference for library units when it differs from the hero one */
    refHitUnit?: number;
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
