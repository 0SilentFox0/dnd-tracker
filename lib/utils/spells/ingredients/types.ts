export type SpellIngredient = { name: string; qty: number; minGp?: number; consumed: boolean; focus: boolean };
export type ComponentFlags = { v: boolean; s: boolean; m: boolean };

export const defaultFocus = (i: { minGp?: number; consumed?: boolean }) => !((i.minGp ?? 0) > 0) && !i.consumed;
