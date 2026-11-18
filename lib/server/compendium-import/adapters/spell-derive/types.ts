import { type NarrativeReason } from '../spell-narrative';

import type { ErrorParams } from '@/lib/constants/api-errors';

export type SpellBlocker =
    | 'SUMMON'
    | 'BUFF_OR_TRANSFORM'
    | 'WEAPON'
    | 'VARIABLE_DAMAGE'
    | 'SELF_DAMAGE'
    | 'ZONE_OR_TRIGGER'
    | 'UNSUPPORTED_CONDITION'
    | 'UNMODELED_EFFECT';

export interface DerivedSpell {
    fields: Record<string, unknown>;
    narrative: boolean;
    narrativeReason?: NarrativeReason;
    riders: string[];
    refs?: Array<{
        path: (string | number)[];
        kind: string;
        name: string;
        source: string;
    }>;
}

export type SpellDerivation =
    | { native: DerivedSpell }
    | { blocker: SpellBlocker; detail?: ErrorParams };
