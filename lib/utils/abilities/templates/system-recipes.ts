import type { Recipe } from './types';

import type { Owned } from '@/lib/utils/abilities/registry/owned';
// <systems:generated>
import { D20_ABILITY_RECIPES } from "@/systems/d20/rules/ability-recipes";
import { MORALE_ABILITY_RECIPES } from "@/systems/morale/rules/ability-recipes";
// </systems:generated>

export const SYSTEM_ABILITY_RECIPES: readonly Owned<readonly Recipe[]>[] = [
    // <systems:generated>
    { system: "d20", items: D20_ABILITY_RECIPES },
    { system: "morale", items: MORALE_ABILITY_RECIPES },
    // </systems:generated>
];
