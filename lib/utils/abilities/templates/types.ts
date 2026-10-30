import type { Ability } from "@/lib/utils/abilities/schema";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

export type RecipeScope = "ability" | "spell";

export type RecipeCategory = "defense" | "offense" | "support" | "resource" | "control";

export type ParamDef = {
  key: string;
  kind: "number" | "dice" | "select" | "damageType" | "stat" | "duration";
  default: string | number;
  min?: number;
  max?: number;
  options?: readonly string[];
};

export type RecipeValues = Record<string, string | number>;

export type RecipeResult = { ability: Omit<Ability, "id"> } | { spell: SpellEffect[]; concentration?: boolean };

export type RecipeContext = { scope: RecipeScope; name: string; note: string };

export type Recipe = {
  id: string;
  category: RecipeCategory;
  scopes: readonly RecipeScope[];
  params: readonly ParamDef[];
  build: (v: RecipeValues, ctx: RecipeContext) => RecipeResult;
};
