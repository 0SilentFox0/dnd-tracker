import { RECIPES } from "./catalog";

export { buildRecipe, buildScratchAbility, FROM_SCRATCH_ID } from "./build";
export { RECIPE_CATEGORIES, RECIPES } from "./catalog";
export type { ParamDef, Recipe, RecipeCategory, RecipeContext, RecipeResult, RecipeScope, RecipeValues } from "./types";

export const ABILITY_TEMPLATES = RECIPES.filter((r) => r.scopes.includes("ability"));
