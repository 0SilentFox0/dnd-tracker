import type { SystemSlot } from './slot';
import type { ArmourGear, SystemInputCtx } from './types';
import type {
    InitiativeScore,
    RuleSystemActions,
    RuleSystemReactions,
} from './types-actions';
import type { ActionDetailsView } from './types-sheet';
import type { RuleSystemTurn } from './types-turn';

import type { AbilityKey } from '@/lib/constants/abilities';
import type { CriticalEffect } from '@/lib/constants/critical-effects';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import type { RollMode } from '@/lib/utils/battle/attack/bonus-math';
import type { ActionFlow } from '@/lib/utils/battle/common/action-flow';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import type {
    DamageConsequencesInput,
    DamageConsequencesResult,
} from '@/lib/utils/battle/damage/consequences';
import type { DieFx } from '@/lib/utils/battle/fx/dice/types';
import type { EquippedArtifactRow } from '@/lib/utils/battle/participant/extract-artifacts';
import type {
    RuleSystemProficiency,
    RuleSystemSaves,
} from '@/lib/utils/battle/saves/types';
import type { AttackRollResult } from '@/lib/utils/battle/types/attack';
import type { ExtractedAttack } from '@/lib/utils/battle/types/participant';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine, TextRef } from '@/types/text';

export interface RuleSystemHitModel {
    offense(p: BattleParticipant): number;
    defense(p: BattleParticipant): number;
    winChance(off: number, def: number): number;
    damage(p: BattleParticipant): number;
    /** Multiplier on effective HP for protection that offense/defense do not capture (armour, ward) */
    durability?(p: BattleParticipant): number;
    /** Save modifiers the balance of a party member reports; absent means none */
    saves?(p: BattleParticipant): Partial<Record<string, number>>;
    /** Hit chance of an average matchup; party/unit factors are relative to it */
    refHit: number;
    /** Reference for library units when it differs from the hero one */
    refHitUnit?: number;
}

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
    roll?: {
        advantage?: number;
        disadvantage?: number;
        mode?: RollMode;
        inspiration?: boolean;
    };
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
    /** Applied by the pipeline to the up-to-date attacker (a spent resource) */
    attackerUpdate?: (p: BattleParticipant) => BattleParticipant;
    /** Applied to the up-to-date target before damage (a state the exchange itself changes) */
    targetUpdate?: (p: BattleParticipant) => BattleParticipant;
}

export interface MitigateStep {
    key: string;
    value: number;
    label: LogLine;
    side: 'attacker' | 'target';
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
    afterHit?(
        target: BattleParticipant,
        round: number
    ): { participant: BattleParticipant; message: LogLine };
}

export interface DamageCtx {
    rules: Ruleset;
    crit: boolean;
    hit?: Omit<MitigateCtx, 'rules' | 'crit'>;
}

export interface DamageResult {
    doubleDice: boolean;
    mitigated?: MitigateResult;
}

export type ZeroHpCtx = DamageConsequencesInput & {
    rules: Ruleset;
    manual?: boolean;
};

/** Runs after `onZeroHp`, folding over its result: what else a blow does to the target (breaks concentration, drops a bank) */
export type DamagedHook = (
    ctx: ZeroHpCtx,
    result: DamageConsequencesResult
) => DamageConsequencesResult;

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
    /** The attack missed critically (natural 1) */
    critFail?: boolean;
    /** An earlier hook already answered the strike */
    handled?: true;
    /** The target's free strike back at the attacker (core primitive: no limits, no accounting); `provoked` ignores the reaction rules */
    counterStrike(
        provoked: boolean,
        from?: { participants: BattleParticipant[]; sceneState?: SystemSlot }
    ): AfterAttackResult | null;
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

export interface RuleSystemActionDetails {
    /** Same reference when nothing is hidden; undefined drops the slot */
    redact(
        details: SystemSlot,
        view: ActionDetailsView
    ): SystemSlot | undefined;
    /** Details reveal something only the actor's side may see (a miscast) */
    actorSecret(details: SystemSlot): boolean;
    /** Applied to every line a player receives; idempotent */
    redactLine(line: LogLine): LogLine;
    /** One group of one throw; [] when nothing was thrown */
    diceFx(details: SystemSlot): DieFx[];
    /** The cast did not take effect */
    failed(details: SystemSlot): boolean;
}

export interface OffHandRules {
    /** The attacker may make off-hand attacks at all */
    allowed(attacker: BattleParticipant): boolean;
    /** An off-hand attack can be made right now */
    ready(attacker: BattleParticipant): boolean;
    /** Records a main-hand attack so that an off-hand follow-up becomes ready */
    arm(attacker: BattleParticipant, attack: BattleAttack): BattleParticipant;
    /** This off-hand attack is made as part of the Attack action; returns the attacker with the free use spent, or null when the bonus action is needed */
    free?(
        attacker: BattleParticipant,
        attack: BattleAttack,
        round: number
    ): BattleParticipant | null;
}

export interface LairRules {
    /** Lair actions the participant has, offered next to its legendary ones */
    abilities(p: BattleParticipant): ResolvedAbility[];
    /** Why the lair action cannot be used now; null when it can */
    blocker(p: BattleParticipant, round: number, key: string): LogLine | null;
    /** Records that the lair action `key` was used in `round` */
    spend(p: BattleParticipant, round: number, key: string): BattleParticipant;
    /** The DM moves the creature into or out of its lair */
    toggle(p: BattleParticipant, active: boolean): BattleParticipant;
    /** The lair toggle is shown for the participant */
    present(p: BattleParticipant): boolean;
    active(p: BattleParticipant): boolean;
}

export interface AttackAbilityResult {
    key: AbilityKey;
    roll: number;
    damage: number;
}

export interface ReachRules {
    /** Cells a melee attack reaches, before the attack's own `reachCells` */
    meleeCells(p: BattleParticipant, attack: BattleAttack): number;
    /** Ranged attacks of this attacker take range and nearby-enemy penalties, thrown melee counts as ranged, and shooting is never blocked by engagement */
    rangedPenalties(p: BattleParticipant): boolean;
}

export interface DamagePartResult {
    dice?: string;
    flat?: number;
}

/** One contribution to the damage of an attack besides its weapon dice and ability modifier */
export type DamagePart = (
    p: BattleParticipant,
    attack: BattleAttack
) => DamagePartResult | null;

export interface InspirationRules {
    /** The campaign's switch for the token */
    enabled(rules: Ruleset): boolean;
    available(p: BattleParticipant): boolean;
    spend(p: BattleParticipant): BattleParticipant;
}

export type CritRules = Pick<
    Ruleset['criticals'],
    'critOn' | 'fumbleOn' | 'effects' | 'disabledSuccess' | 'disabledFail'
>;

export interface AttackRiderOffer {
    options: { effect: string; dice: number; label: TextRef }[];
    maxEffects: number;
    sneakKey: string;
    sneakDice: number;
    /** The next selection after the player taps `effect`; unchanged when it does not fit */
    toggle(selected: string[], effect: string): string[];
}

export interface HitRidersCtx {
    attacker: BattleParticipant;
    round: number;
    effects: string[];
}

export interface HitRidersPlan {
    /** Set when the chosen riders cannot be bought */
    rejected?: TextRef;
    /** Damage dice forgone to pay for the riders */
    dice: number;
    /** Resolves the riders after the hit event fired; returns true when something was applied */
    apply(
        flow: ActionFlow,
        targetId: string,
        fired: readonly string[]
    ): boolean;
}

export interface MasteryStrikeCtx {
    flow: ActionFlow;
    attackerId: string;
    targetId: string;
    attack: BattleAttack;
    hit: boolean;
}

export interface MasteryHooks {
    /** Weapon-mastery effect of a resolved strike (hit or miss) */
    onStrike(ctx: MasteryStrikeCtx): void;
    /** After a melee hit: whether a second adjacent creature may be struck, and the attacker with that use spent */
    cleave(
        attacker: BattleParticipant,
        attack: BattleAttack,
        round: number
    ): { spent: BattleParticipant } | null;
}

export interface RuleSystemAttackHooks {
    masteries?: MasteryHooks;
    /** Optional riders bought at the hit (offer for the wizard); absent means none */
    riderOptions?(
        attacker: BattleParticipant,
        round: number
    ): AttackRiderOffer | null;
    /** Cost and resolution of the riders a request chose; absent means the request's riders are ignored */
    hitRiders?(ctx: HitRidersCtx): HitRidersPlan;
}

export type ActionAssertCtx =
    | {
          kind: 'attack';
          actor: BattleParticipant;
          attack: BattleAttack;
          targets: BattleParticipant[];
          participants: BattleParticipant[];
      }
    | { kind: 'cast'; actor: BattleParticipant };

export interface RuleSystemCombat {
    /** Critical-hit thresholds and effects of the campaign rules; absent means the neutral defaults */
    crit?(rules: Ruleset): CritRules;
    /** Whether a won battle awards XP on its own; absent means never */
    autoXp?(rules: Ruleset): boolean;
    details?: RuleSystemActionDetails;
    /** Validates the system's input of an attack or a cast before it runs */
    input?: { assert(system: SystemSlot, ctx: SystemInputCtx): void };
    /** Rejects an attack or a cast the actor's state forbids; absent means none */
    assertAction?(ctx: ActionAssertCtx): void;
    /** Off-hand attacks; absent means never */
    secondaryAttack?: OffHandRules;
    /** Lair actions and the lair toggle; absent means none */
    sceneActions?: LairRules;
    /** Ability of an attack and its roll and damage modifiers; absent means the attack type's default ability */
    attackAbility?(
        p: BattleParticipant,
        attack: BattleAttack,
        participants: BattleParticipant[]
    ): AttackAbilityResult;
    /** Melee reach and ranged-attack penalties; absent means one cell and no penalties */
    reach?: ReachRules;
    /** Extra dice and flat damage of an attack, base first, then modules */
    damageParts?: readonly DamagePart[];
    /** A spendable boost to one attack roll; absent means none */
    rerollToken?: InspirationRules;
    /** Who judges an attack: the client rolls and the server checks vs AC, or the server resolves the whole test */
    judge: 'client' | 'server';
    attack?: RuleSystemAttackHooks;
    /** Attack roll of a zone trigger against one target; absent means a zone attack hits without a roll */
    zoneAttack?(ctx: { rng: () => number; bonus: number; ac: number }): {
        roll: number;
        hit: boolean;
    };
    dice: number;
    attacksOf?(input: { rows: EquippedArtifactRow[] }): ExtractedAttack[];
    participantFields?(
        row: { characteristics?: unknown },
        gear?: ArmourGear
    ): SystemSlot;
    /** Ranks participants with equal initiative: higher wins */
    tieBreak(p: BattleParticipant): number;
    /** Absent means neither a bonus action nor a reaction */
    actionEconomy?: { bonusAction: boolean; reaction: boolean };
    resolveAttack(ctx: ResolveAttackCtx): ResolvedAttack;
    /** The roll recorded for an attack that never happened (the target or the attacker dropped out first) */
    abortedRoll(ctx: ResolveAttackCtx): AttackRollResult;
    /** Characteristic and base target an attack is rolled against, before situational modifiers (percentile systems only) */
    attackTarget?(
        attacker: BattleParticipant,
        attack: BattleAttack
    ): { label: LogLine; target: number };
    /** Crit-dice rule and, when `ctx.hit` is set, the system's own damage mitigation of that hit */
    damage(ctx: DamageCtx): DamageResult;
    /** Net percent of the non-immune resistance (+) and vulnerability (−) flags matching a hit; absent means they add up */
    combineResistance?(percents: readonly number[], rules: Ruleset): number;
    /** Falling to 0 HP (dying, death, unconsciousness); `ctx.manual` is a DM status change settled the same way */
    onZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult;
    onDamaged?: readonly DamagedHook[];
    /** Core sets Unconscious the moment HP hits 0; `false` leaves the status to `onZeroHp` (absent means true) */
    autoUnconsciousAtZero?(rules: Ruleset): boolean;
    /** A participant raised above 0 HP (heal, victory revive) leaves the system's dying state */
    onRevived?(p: BattleParticipant): BattleParticipant;
    /** Stays down above 0 HP (healing, DM HP edits and status settling never raise it) */
    keepsDown?(p: BattleParticipant): boolean;
    /** A downed participant still in the fight (d20: dying, not stable); its side has not lost yet */
    holdsOn?(p: BattleParticipant): boolean;
    turn?: RuleSystemTurn;
    /** Absent means `noActions` */
    actions?: RuleSystemActions;
    /** Absent means `noReactions` */
    reactions?: RuleSystemReactions;
    saves?: RuleSystemSaves;
    proficiency?: RuleSystemProficiency;
    /** Hooks after each strike of an attack, base first, then modules */
    afterAttack?: readonly AfterAttackHook[];
    /** Base score before flat modifiers; `roll`/`die` are null when nothing was rolled (static mode, pinned) */
    initiative(
        p: BattleParticipant,
        ctx: { rules: Pick<Ruleset, 'initiative'>; rng: Rng; roll?: boolean }
    ): InitiativeScore;
    /** Starting values the participant builders use instead of the d20 sheet columns */
    baseStats?(row: { characteristics?: unknown }): {
        initiative: number;
        speed: number;
    };
    /** Balance: hit chance from offense/defense numbers (instead of d20 to-hit vs AC) and expected damage per hit against a reference target; absent means `noHitModel` */
    hitModel?: RuleSystemHitModel;
    /** Edition-dependent variant of `hitModel` for a campaign's rules */
    hitModelFor?(rules: Pick<Ruleset, 'system'>): RuleSystemHitModel;
}
