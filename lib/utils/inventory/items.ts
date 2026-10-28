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
      },
    ];
  });
}

export function normalizeStash(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return [...new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))];
}
