import type { BookSpell } from "@/types/spells";

export interface SpellRow {
  id: string;
  name: string;
  level: number;
  type: string;
  damageType: string;
  diceCount: number | null;
  diceType: string | null;
  savingThrow: unknown;
  hitCheck: unknown;
  description: string | null;
  icon: string | null;
  range: string | null;
  duration: string | null;
  concentration: boolean;
  damageElement: string | null;
  spellGroup: { id: string; name: string } | null;
}

const TYPES = ["target", "aoe", "no_target"] as const;

const DAMAGE_TYPES = ["damage", "heal", "all"] as const;

const record = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

function savingThrowOf(raw: unknown): BookSpell["savingThrow"] {
  const r = record(raw);

  if (!r || typeof r.ability !== "string") return null;

  return { ability: r.ability, onSuccess: r.onSuccess === "none" ? "none" : "half", ...(typeof r.dc === "number" && { dc: r.dc }) };
}

function hitCheckOf(raw: unknown): BookSpell["hitCheck"] {
  const r = record(raw);

  return r && typeof r.ability === "string" && typeof r.dc === "number" ? { ability: r.ability, dc: r.dc } : null;
}

export function toBookSpell(row: SpellRow): BookSpell {
  return {
    ...row,
    type: (TYPES as readonly string[]).includes(row.type) ? (row.type as BookSpell["type"]) : "target",
    damageType: (DAMAGE_TYPES as readonly string[]).includes(row.damageType) ? (row.damageType as BookSpell["damageType"]) : "damage",
    savingThrow: savingThrowOf(row.savingThrow),
    hitCheck: hitCheckOf(row.hitCheck),
  };
}
