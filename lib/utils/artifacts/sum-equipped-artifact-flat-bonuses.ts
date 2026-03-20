/**
 * Сума плоских бонусів з екіпірованих артефактів (як у бою, без all_allies / all_enemies).
 */

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
  parseEffectScopeObject,
} from "@/lib/constants/artifact-effect-scope";
import { ArtifactModifierType } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type EquippedArtifactFlatBonusTotals = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  armorClass: number;
  speed: number;
  initiative: number;
  morale: number;
  minTargets: number;
  maxTargets: number;
  spellSlotBonusByLevel: Record<string, number>;
};

export type ArtifactRowForFlatBonus = {
  id: string;
  bonuses?: unknown;
  modifiers?: unknown;
  passiveAbility?: unknown;
};

function emptyTotals(): EquippedArtifactFlatBonusTotals {
  return {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
    armorClass: 0,
    speed: 0,
    initiative: 0,
    morale: 0,
    minTargets: 0,
    maxTargets: 0,
    spellSlotBonusByLevel: {},
  };
}

export function sumEquippedArtifactFlatBonuses(
  equipped: EquippedItems,
  artifacts: ArtifactRowForFlatBonus[],
): EquippedArtifactFlatBonusTotals {
  const totals = emptyTotals();

  const byId = new Map(artifacts.map((a) => [a.id, a]));

  for (const artifactId of Object.values(equipped)) {
    if (typeof artifactId !== "string" || !artifactId) continue;

    const artifact = byId.get(artifactId);

    if (!artifact) continue;

    const passiveRecord = artifact.passiveAbility
      ? (artifact.passiveAbility as Record<string, unknown>)
      : undefined;

    const scope = passiveRecord
      ? parseEffectScopeObject(passiveRecord.effectScope)
      : {};

    const aud = scope.effectAudience;

    if (
      aud === ARTIFACT_EFFECT_ALL_ALLIES ||
      aud === ARTIFACT_EFFECT_ALL_ENEMIES
    ) {
      continue;
    }

    const b = (artifact.bonuses as Record<string, unknown>) ?? {};

    for (const k of ABILITY_KEYS) {
      const v = b[k];

      if (typeof v === "number" && v !== 0) {
        totals[k] += v;
      }
    }

    if (typeof b.armorClass === "number" && b.armorClass !== 0) {
      totals.armorClass += b.armorClass;
    }

    if (typeof b.speed === "number" && b.speed !== 0) {
      totals.speed += b.speed;
    }

    if (typeof b.initiative === "number" && b.initiative !== 0) {
      totals.initiative += b.initiative;
    }

    if (typeof b.morale === "number" && b.morale !== 0) {
      totals.morale += b.morale;
    }

    if (typeof b.minTargets === "number") {
      totals.minTargets += b.minTargets;
    }

    if (typeof b.maxTargets === "number") {
      totals.maxTargets += b.maxTargets;
    }

    for (const [key, v] of Object.entries(b)) {
      const m = /^slotBonus_(\d+)$/.exec(key);

      if (m && typeof v === "number" && v !== 0) {
        const lvl = m[1];

        totals.spellSlotBonusByLevel[lvl] =
          (totals.spellSlotBonusByLevel[lvl] ?? 0) + v;
      }
    }

    const modifiers = Array.isArray(artifact.modifiers)
      ? artifact.modifiers
      : [];

    for (const modifier of modifiers) {
      const t = (modifier as { type?: string }).type;

      const raw = (modifier as { value?: unknown }).value;

      const n =
        typeof raw === "number" ? raw : Number.parseFloat(String(raw));

      const modVal = Number.isFinite(n) ? n : 0;

      if (t === "min_targets" || t === ArtifactModifierType.MIN_TARGETS) {
        totals.minTargets += modVal;
      }

      if (t === "max_targets" || t === ArtifactModifierType.MAX_TARGETS) {
        totals.maxTargets += modVal;
      }
    }
  }

  return totals;
}
