import type { MoveHook } from './types-turn';

import type {
    CoreActionAvailability,
    CoreActionDef,
    LegendaryAttackInput,
    LegendaryAttackResult,
    MovementInput,
    MovementResult,
    RunCoreActionInput,
    RunCoreActionResult,
} from '@/lib/utils/battle/actions/types';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

/** Core actions (dash, grapple, …), movement and legendary strikes; a system without them answers with `noActions` */
export interface RuleSystemActions {
    /** The rules' `actions` section is switched on */
    enabled(rules: Ruleset): boolean;
    catalog: Readonly<Record<string, CoreActionDef>>;
    cost(
        key: string,
        actor: BattleParticipant,
        participants: BattleParticipant[]
    ): CoreActionDef['cost'];
    targets(
        key: string,
        actor: BattleParticipant,
        participants: BattleParticipant[],
        map: BattleMapConfig | null | undefined
    ): BattleParticipant[];
    available(
        key: string,
        actor: BattleParticipant,
        participants: BattleParticipant[],
        map: BattleMapConfig | null | undefined,
        rules: Ruleset
    ): CoreActionAvailability;
    /** Standing up from prone is possible with the movement left */
    canStandUp(p: BattleParticipant, rules: Ruleset): boolean;
    run(input: RunCoreActionInput): RunCoreActionResult;
    legendaryAttack(input: LegendaryAttackInput): LegendaryAttackResult;
    /** A move with whatever it provokes (dragging a grappled foe, `onMove` hooks) */
    move(input: MovementInput): MovementResult;
    /** Hooks run on every move with a path, base first, then modules; the first that stops the mover ends the chain. The base's own `move` must run them (only d20 does) */
    onMove?: readonly MoveHook[];
    /** Drops holds whose grappler fell or is no longer adjacent; same array when there are none */
    releaseInvalidGrapples(
        ps: BattleParticipant[],
        map?: BattleMapConfig | null
    ): { participants: BattleParticipant[]; messages: LogLine[] };
}

export interface RuleSystemReactions {
    /** Why the participant cannot react now; null when it can */
    blocker(p: BattleParticipant): LogLine | null;
}

export interface InitiativeScore {
    total: number;
    roll: number | null;
    die: number | null;
}
