import type { AbilityModule } from '@/lib/utils/abilities/registry/install';
import { MORALE_FLAG_ROWS } from '@/systems/morale/rules/ability-flag-rows';
import { MORALE_MODULE_EFFECT_ROWS } from '@/systems/morale/rules/ability-module-effect-rows';
import { MORALE_ABILITY_VARIABLES } from '@/systems/morale/rules/ability-variables';

export const MORALE_ABILITY_MODULE: AbilityModule = {
    flagRows: MORALE_FLAG_ROWS,
    moduleEffectRows: MORALE_MODULE_EFFECT_ROWS,
    variables: MORALE_ABILITY_VARIABLES,
};
