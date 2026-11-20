import type { LabeledEffectInput } from '@/lib/utils/battle/actions/effects';
import type {
    ApplyConditionOptions,
    ApplyConditionResult,
    ConditionEffectOptions,
} from '@/lib/utils/battle/conditions/set';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface SystemConditionInfo {
    key: string;
    maxLevel: number | null;
    endTest: 'roll' | 'stand' | null;
    timed: boolean;
    /** i18n key */
    label: string;
}

export interface SystemConditionApply {
    key: string;
    levels?: number;
    rounds?: number;
    round: number;
    source?: ActiveEffect['source'];
    sourceName: LogLine;
    concealed?: true;
    /** Lets a system pick its edition-dependent effects */
    rules?: Ruleset;
    /** Dice the application may roll (a test the condition triggers) */
    rng?: Rng;
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
    apply(
        ps: BattleParticipant[],
        targetId: string,
        input: SystemConditionApply
    ): SystemConditionResult;
    reduce(
        ps: BattleParticipant[],
        targetId: string,
        key: string,
        by: 1 | 'all'
    ): SystemConditionResult & { removed: boolean };
    /** Downed allies stay at 0 HP after a victory (healing raises them) */
    keepDownedAfterVictory?: true;
    /** Effects that survive a participant going UNCONSCIOUS (cleared on death) */
    keepsWhenDown?(effect: ActiveEffect): boolean;
    attemptEnd(
        ps: BattleParticipant[],
        id: string,
        key: string,
        ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number }
    ): SystemConditionResult & { success: boolean };
}

/** Standard conditions (blinded, prone, exhaustion…) that core rules apply; unlike `conditions`, every base provides it */
export interface RuleSystemConditionSet {
    /** The base's standard condition vocabulary; stored keys never change */
    keys: readonly string[];
    /** i18n namespace path of a standard condition (`<path>.label`, `<path>.description`) */
    labelKey(key: string): string;
    /** Whether the campaign rules switch standard conditions on; absent means never */
    enabled?(rules: Ruleset): boolean;
    /** Campaign-defined conditions; absent means none */
    custom?(rules: Ruleset): Ruleset['conditions']['custom'];
    /** `blocked`: the target is immune, or the system has no such condition */
    apply(
        ps: BattleParticipant[],
        targetId: string,
        opts: ApplyConditionOptions
    ): ApplyConditionResult;
    /** null: the system has no such condition */
    effectInput(
        key: string,
        opts: ConditionEffectOptions
    ): LabeledEffectInput | null;
}
