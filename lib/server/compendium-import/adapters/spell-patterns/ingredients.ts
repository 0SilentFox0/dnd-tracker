import { INGREDIENT_NAME_MAX } from "@/lib/constants/spell-ingredients";
import type { SpellIngredient } from "@/lib/utils/spells/ingredients/types";
import { defaultFocus } from "@/lib/utils/spells/ingredients/types";

const COST = /worth\s+(?:at\s+least\s+)?([\d,]+(?:\.\d+)?)\s*\+?\s*(?:gp|gold)/gi;

const CONSUMES = /\bconsum(?:e|es|ed)\b/i;

const cleanName = (text: string) =>
  text
    .replace(/^\s*\(|\)\s*$/g, "")
    .replace(/,?\s*(?:all of\s+)?which\b.*$/i, "")
    .replace(/,?\s*(?:that|and)\s+the spell consumes.*$/i, "")
    .replace(/\s*worth\s+(?:at\s+least\s+)?[\d,]+(?:\.\d+)?\s*\+?\s*(?:gp|gold)\b\.?/gi, "")
    .replace(/[\s,;.]+$/, "")
    .trim()
    .slice(0, INGREDIENT_NAME_MAX)
    .trim();

function build(name: string, minGp: number | undefined, consumed: boolean): SpellIngredient[] | null {
  if (!name) return null;

  const base = { name, qty: 1, consumed, ...(minGp !== undefined && minGp > 0 && { minGp }) };

  return [{ ...base, focus: defaultFocus(base) }];
}

export function parseMaterialText(text: string): SpellIngredient[] | null {
  const costs = [...text.matchAll(COST)].map((m) => Number(m[1].replace(/,/g, "")));

  if (costs.length > 1 || costs.some((c) => !Number.isFinite(c))) return null;

  return build(cleanName(text), costs[0], CONSUMES.test(text));
}

export function parseMaterial(raw: { text?: string; cost?: number; consume?: boolean | "optional" } | string): SpellIngredient[] | null {
  if (typeof raw === "string") return parseMaterialText(raw);

  const text = raw.text ?? "";

  if ([...text.matchAll(COST)].length > 1) return null;

  const cost = typeof raw.cost === "number" && raw.cost > 0 ? raw.cost / 100 : undefined;

  const parsed = parseMaterialText(text);

  if (!parsed) return null;

  return build(parsed[0].name, cost ?? parsed[0].minGp, raw.consume === true || (raw.consume === undefined && parsed[0].consumed));
}
