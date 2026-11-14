import type { AbilityKey } from '@/lib/constants/abilities';
import type { RulesEdition } from '@/lib/constants/rules';
import type {
    CustomConditionKey,
    StandardConditionKey,
} from '@/lib/utils/abilities/schema/kinds';
import type { Ruleset } from '@/lib/utils/rules';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const PERMANENT_ROUNDS = 99;

export type ConditionKey = StandardConditionKey | CustomConditionKey;

export type ExhaustionVariant = RulesEdition;

export interface ApplyConditionOptions {
    key: ConditionKey;
    rounds: number;
    permanent?: boolean;
    levels?: number;
    saveEnds?: { ability: AbilityKey; dc: number };
    source: ActiveEffect['source'];
    sourceName: LogLine;
    timedKey: string;
    round: number;
    rules: Ruleset;
}

export interface ApplyConditionResult {
    participants: BattleParticipant[];
    messages: LogLine[];
    blocked: boolean;
}

export interface ConditionEffectOptions {
    timedKey: string;
    rounds: number;
    exhaustion: ExhaustionVariant;
    permanent?: boolean;
    levels?: number;
    saveEnds?: ActiveEffect['saveEnds'];
    source?: ActiveEffect['source'];
}
