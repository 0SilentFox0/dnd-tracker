import type { AbilityKey } from "@/lib/constants/abilities";

export { clamp } from "@/lib/utils/common/clamp";
export { numberWord, parseDiceExpr } from "@/lib/utils/spells/derive/text";

export const ABILITY_BY_SHORT: Record<string, AbilityKey> = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };

export const titleCase = (s: string) => s.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

export const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);
