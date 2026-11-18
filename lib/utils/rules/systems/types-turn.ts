import type { SystemSlot } from './slot';
import type { ApplyDamageConsequences } from './types';

import type { MovementInput } from '@/lib/utils/battle/actions/types';
import type { TurnGateOutcome } from '@/lib/utils/battle/flows/turn-flow';
import type { BattleSceneState } from '@/lib/utils/battle/store';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

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

export type RunAbilities =
    typeof import('@/lib/utils/abilities/engine/core/run-abilities').runAbilities;

export interface TurnAdvanceCtx extends TurnHookCtx {
    scene: BattleSceneState;
    /** Fires ability triggers; injected because system code cannot import the engine back */
    run: RunAbilities;
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

export type TurnHook<C extends TurnHookCtx = TurnHookCtx> = (
    ctx: C
) => TurnHookResult;

export interface ActGateScope {
    participants: BattleParticipant[];
    scene: Pick<BattleSceneState, 'turnIndex' | 'pendingMoraleCheck'>;
    rules: Ruleset;
}

export interface ActGateBlock {
    code: 'action_used' | 'action_rejected';
    /** REJECT / API_ERRORS key */
    key: string;
}

/** Blocks acting (`phase: "act"`) or ending the turn (`"end"`); `skipCheck` waives the pending-check part of an act */
export type ActGate = (
    scope: ActGateScope,
    participantId: string,
    opts: { phase: 'act' | 'end'; skipCheck?: boolean }
) => ActGateBlock | null;

/** The client-side check a participant must resolve before acting; `outcomeOf` reads a stored pending check */
export interface TurnStartCheck {
    due(scope: ActGateScope, participantId: string): boolean;
    /** The value the check rolls against (after flags and timed effects) */
    valueOf(
        participant: BattleParticipant,
        participants: BattleParticipant[]
    ): number;
    outcomeOf(
        pending: unknown,
        participantId: string
    ): TurnGateOutcome | undefined;
}

/** Clears the per-turn part of a participant's system state; 'reaction' = only what a regained reaction restores */
export type TurnStateReset = (
    p: BattleParticipant,
    scope: 'turn' | 'reaction'
) => BattleParticipant;

/** Hook lists run in order, base first, then modules (`runTurnHooks`) */
export interface RuleSystemTurn {
    /** Resets system state when a turn begins (or a reaction is regained) */
    resetState?: readonly TurnStateReset[];
    /** Client turn gate (a check before the first action) */
    startCheck?: TurnStartCheck;
    /** Before the turn passes on */
    beforeAdvance?: readonly TurnHook<TurnAdvanceCtx>[];
    /** Gates before a participant acts or ends its turn; the first block wins */
    actGates?: readonly ActGate[];
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

/** A move that is under way: the path is known and the mover stands at `start` */
export type MoveHookInput = MovementInput & {
    path: GridPoint[];
    start: GridPoint;
};

export interface MoveHookResult {
    participants: BattleParticipant[];
    /** The mover is stopped here (dropped by a strike); null = the move goes on */
    stopAt: GridPoint | null;
    /** Movement spent when stopped */
    cost: number;
    actions: BattleAction[];
    messages: LogLine[];
    sceneState?: SystemSlot;
}

/** Reacts to a move before it lands (opportunity strikes); null = nothing to add */
export type MoveHook = (input: MoveHookInput) => MoveHookResult | null;
