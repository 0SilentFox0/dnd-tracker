/**
 * Структура бонусу повного сету (`ArtifactSet.setBonus`).
 * Докладніше: docs/ARTIFACT-SETS.md, lib/constants/artifact-sets.ts
 */

import type { ArtifactEffectAudience } from "@/lib/constants/artifact-effect-scope";
import { parseEffectScopeObject } from "@/lib/constants/artifact-effect-scope";

export interface ArtifactSetModifier {
  type: string;
  value: number;
  isPercentage?: boolean;
  element?: string;
}

export interface ArtifactSetPassiveEffect {
  stat: string;
  type?: string;
  value?: number | string;
}

export interface ParsedArtifactSetBonus {
  name?: string;
  description?: string;
  bonuses: Record<string, number>;
  modifiers: ArtifactSetModifier[];
  spellSlotBonus: Record<string, number>;
  passiveEffects: ArtifactSetPassiveEffect[];
  /** За замовчуванням — лише носій; інакше чергається на роздачу після збору всіх учасників. */
  effectAudience?: ArtifactEffectAudience;
  /** ID заклинань кампанії, до яких ціль імунна (після застосування бонусу). */
  immuneSpellIds?: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseNumericRecord(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};

  if (!isRecord(raw)) return out;

  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }

  return out;
}

function parseModifiersArray(raw: unknown): ArtifactSetModifier[] {
  if (!Array.isArray(raw)) return [];

  const out: ArtifactSetModifier[] = [];

  for (const m of raw) {
    if (!isRecord(m)) continue;

    const type = m.type;

    const value = m.value;

    if (typeof type !== "string" || typeof value !== "number") continue;

    out.push({
      type,
      value,
      isPercentage: Boolean(m.isPercentage),
      element: typeof m.element === "string" ? m.element : undefined,
    });
  }

  return out;
}

function parsePassiveEffectsArray(raw: unknown): ArtifactSetPassiveEffect[] {
  if (!Array.isArray(raw)) return [];

  const out: ArtifactSetPassiveEffect[] = [];

  for (const p of raw) {
    if (!isRecord(p)) continue;

    const stat = p.stat;

    if (typeof stat !== "string") continue;

    out.push({
      stat,
      type: typeof p.type === "string" ? p.type : undefined,
      value:
        typeof p.value === "number" || typeof p.value === "string"
          ? p.value
          : undefined,
    });
  }

  return out;
}

function parseEffectScopeFromRaw(
  raw: Record<string, unknown>,
): Pick<ParsedArtifactSetBonus, "effectAudience" | "immuneSpellIds"> {
  return parseEffectScopeObject(raw.effectScope);
}

const emptyParsed = (): ParsedArtifactSetBonus => ({
  bonuses: {},
  modifiers: [],
  spellSlotBonus: {},
  passiveEffects: [],
});

/** Нормалізує JSON з БД для застосування в бою. */
export function parseArtifactSetBonus(raw: unknown): ParsedArtifactSetBonus {
  if (raw == null) return emptyParsed();

  if (typeof raw === "string") {
    return { ...emptyParsed(), description: raw };
  }

  if (!isRecord(raw)) return emptyParsed();

  const slotSrc = raw.spellSlotBonus ?? raw.spellSlots;

  const scopeFields = parseEffectScopeFromRaw(raw);

  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    bonuses: parseNumericRecord(raw.bonuses),
    modifiers: parseModifiersArray(raw.modifiers),
    spellSlotBonus: parseNumericRecord(slotSrc),
    passiveEffects: parsePassiveEffectsArray(raw.passiveEffects),
    ...scopeFields,
  };
}

export type { ArtifactEffectAudience };
