import { CORE_RECIPES } from './catalog';
import { SYSTEM_ABILITY_RECIPES } from './system-recipes';
import type { Recipe } from './types';

import { ownedIn } from '@/lib/utils/abilities/registry/owned';
import type { Composition } from '@/lib/utils/rules/systems/catalog';

export { buildRecipe, buildScratchAbility, FROM_SCRATCH_ID } from './build';
export { RECIPE_CATEGORIES } from './catalog';
export type {
    ParamDef,
    Recipe,
    RecipeCategory,
    RecipeContext,
    RecipeResult,
    RecipeScope,
    RecipeValues,
} from './types';

/** Every recipe of core and all modules (registry-wide; the editor offers `recipesOf(composition)`). */
export const RECIPES: readonly Recipe[] = [
    ...CORE_RECIPES,
    ...SYSTEM_ABILITY_RECIPES.flatMap((o) => o.items),
];

export const recipesOf = (c: Composition): readonly Recipe[] => [
    ...CORE_RECIPES,
    ...ownedIn(SYSTEM_ABILITY_RECIPES, c).flat(),
];

export const ABILITY_TEMPLATES = RECIPES.filter((r) =>
    r.scopes.includes('ability')
);
