import type { PartyPower } from '@/lib/utils/battle/balance/fair';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const D20_MODEL = ruleSystemOf(DEFAULT_RULES).combat.hitModel;

export type PartialModelParty<T> = Omit<T, 'hit' | 'refHit' | 'refHitUnit'> &
    Partial<Pick<PartyPower, 'hit' | 'refHit' | 'refHitUnit'>>;

export const withD20Model = <T extends object>(
    p: PartialModelParty<T>
): T & Pick<PartyPower, 'hit' | 'refHit' | 'refHitUnit'> =>
    ({
        hit: D20_MODEL.winChance,
        refHit: D20_MODEL.refHit,
        refHitUnit: D20_MODEL.refHitUnit ?? D20_MODEL.refHit,
        ...p,
    }) as T & Pick<PartyPower, 'hit' | 'refHit' | 'refHitUnit'>;
