import type { AbilityModule } from '@/lib/utils/abilities/registry/install';
import { D20_FLAG_ROWS } from '@/systems/d20/rules/ability-flag-rows';
import { D20_ABILITY_VARIABLES } from '@/systems/d20/rules/ability-variables';

export const D20_ABILITY_MODULE: AbilityModule = {
    flagRows: D20_FLAG_ROWS,
    variables: D20_ABILITY_VARIABLES,
};
