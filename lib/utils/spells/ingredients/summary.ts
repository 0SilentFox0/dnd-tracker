import type { ComponentFlags, SpellIngredient } from "@/lib/schemas/spell-ingredients";

export interface SummaryLabels {
  minGp: (gp: number) => string;
  consumed: string;
}

export function summarizeIngredients(list: SpellIngredient[], labels: SummaryLabels): string {
  return list
    .filter((i) => i.name.trim())
    .map((i) => {
      const notes = [(i.minGp ?? 0) > 0 ? labels.minGp(i.minGp as number) : null, i.consumed ? labels.consumed : null].filter(Boolean);

      return `${i.qty > 1 ? `${i.qty}× ` : ""}${i.name.trim()}${notes.length ? ` (${notes.join(", ")})` : ""}`;
    })
    .join("; ");
}

const hasLetter = (text: string, letter: string) => new RegExp(`(^|[^A-Za-z])${letter}([^A-Za-z]|$)`).test(text);

export function deriveComponentFlags(text: string | null | undefined): ComponentFlags | null {
  const head = text?.replace(/\([\s\S]*$/, "").trim();

  if (!head) return null;

  return { v: hasLetter(head, "V"), s: hasLetter(head, "S"), m: hasLetter(head, "M") };
}
