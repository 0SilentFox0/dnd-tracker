import { ABILITY_VARIABLES, FORMULA_VARIABLE_NAMES } from './variables';

import type { Flat } from '@/lib/utils/abilities/schema';
import { evaluateFormula } from '@/lib/utils/battle/common/formula-evaluator';
import type { BattleParticipant } from '@/types/battle';

export const FORMULA_VARIABLES: readonly string[] = FORMULA_VARIABLE_NAMES;

export const formulaContext = (p: BattleParticipant): Record<string, number> =>
    Object.fromEntries(
        Object.entries(ABILITY_VARIABLES).map(([name, read]) => [name, read(p)])
    );

export function resolveFlat(
    flat: Flat | { spellRoll: number },
    owner: BattleParticipant
): number {
    if (typeof flat === 'number') return flat;

    return 'formula' in flat
        ? Math.floor(evaluateFormula(flat.formula, formulaContext(owner)))
        : 0;
}
