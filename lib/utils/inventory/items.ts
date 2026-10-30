import { INGREDIENT_SLUG_RE } from "@/lib/constants/spell-ingredients";
import type { SpecialItem } from "@/types/inventory";

export function normalizeItems(raw: unknown): SpecialItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((r, i): SpecialItem[] => {
    if (!r || typeof r !== "object" || typeof (r as { name?: unknown }).name !== "string") return [];

    const o = r as Record<string, unknown>;

    return [
      {
        id: typeof o.id === "string" && o.id ? o.id : `legacy-${i}`,
        name: o.name as string,
        ...(typeof o.description === "string" && o.description ? { description: o.description } : {}),
        quantity: typeof o.quantity === "number" && o.quantity > 0 ? Math.floor(o.quantity) : 1,
        consumable: o.consumable === true,
        ...(typeof o.artifactId === "string" && o.artifactId ? { artifactId: o.artifactId } : {}),
        ...(typeof o.parameter === "string" && /^[a-z][a-z0-9_-]{0,39}$/.test(o.parameter) ? { parameter: o.parameter } : {}),
        ...(typeof o.worthGp === "number" && Number.isFinite(o.worthGp) && o.worthGp >= 0 ? { worthGp: o.worthGp } : {}),
        ...(typeof o.ingredient === "string" && INGREDIENT_SLUG_RE.test(o.ingredient) ? { ingredient: o.ingredient } : {}),
        ...(typeof o.spellId === "string" && o.spellId ? { spellId: o.spellId } : {}),
      },
    ];
  });
}

export function normalizeStash(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return [...new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))];
}
