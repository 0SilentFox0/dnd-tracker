/**
 * Перетворення екіпірованого артефакта на ParsedArtifactSetBonus для merge / черги scoped-ефектів.
 */

import type {
  ArtifactSetModifier,
  ArtifactSetPassiveEffect,
  ParsedArtifactSetBonus,
} from "@/lib/types/artifact-set-bonus";
import type { EquippedArtifact } from "@/types/battle";

function parsePassiveEffectsFromRecord(
  passive: Record<string, unknown>,
): ArtifactSetPassiveEffect[] {
  const raw = passive.effects;

  if (!Array.isArray(raw)) return [];

  const out: ArtifactSetPassiveEffect[] = [];

  for (const p of raw) {
    if (!p || typeof p !== "object") continue;

    const o = p as Record<string, unknown>;

    const stat = o.stat;

    if (typeof stat !== "string") continue;

    out.push({
      stat,
      type: typeof o.type === "string" ? o.type : undefined,
      value:
        typeof o.value === "number" || typeof o.value === "string"
          ? o.value
          : undefined,
    });
  }

  return out;
}

function mapModifiers(a: EquippedArtifact): ArtifactSetModifier[] {
  return (a.modifiers ?? []).map((m) => {
    const raw = m.value;

    const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));

    return {
      type: m.type,
      value: Number.isFinite(n) ? n : 0,
      isPercentage: Boolean(m.isPercentage),
      element: undefined,
    };
  });
}

export function equippedArtifactToParsedBonusBundle(
  a: EquippedArtifact,
): ParsedArtifactSetBonus {
  const rawBonuses = { ...(a.bonuses ?? {}) };

  const bonuses: Record<string, number> = {};

  const spellSlotBonus: Record<string, number> = {};

  for (const [k, v] of Object.entries(rawBonuses)) {
    const m = /^slotBonus_(\d+)$/.exec(k);

    if (m && typeof v === "number" && Number.isFinite(v)) {
      const lvl = m[1];

      spellSlotBonus[lvl] = (spellSlotBonus[lvl] ?? 0) + v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      bonuses[k] = v;
    }
  }

  const passiveEffects = a.passiveAbility
    ? parsePassiveEffectsFromRecord(a.passiveAbility as Record<string, unknown>)
    : [];

  return {
    bonuses,
    modifiers: mapModifiers(a),
    spellSlotBonus,
    passiveEffects,
    immuneSpellIds:
      a.immuneSpellIds && a.immuneSpellIds.length > 0
        ? [...a.immuneSpellIds]
        : undefined,
    effectAudience: a.effectAudience,
  };
}
