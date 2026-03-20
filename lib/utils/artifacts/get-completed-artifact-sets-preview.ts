/**
 * Які сети вважаються повними за екіпіровкою та їхні бонуси (для листа персонажа).
 * Логіка збігу з `applyCompletedArtifactSets`: усі артефакти з `set.artifacts` мають бути в слотах.
 */

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import {
  parseArtifactSetBonus,
  type ParsedArtifactSetBonus,
} from "@/lib/types/artifact-set-bonus";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { EquippedItems } from "@/types/inventory";

export type CompletedArtifactSetPreview = {
  setId: string;
  setName: string;
  displayName: string;
  parsed: ParsedArtifactSetBonus;
  /** Як у бою: не накладається на лист носія, а роздається союзникам/ворогам. */
  isBattleScoped: boolean;
};

function previewHasDisplayableContent(parsed: ParsedArtifactSetBonus): boolean {
  if (Object.keys(parsed.bonuses).some((k) => parsed.bonuses[k] !== 0)) {
    return true;
  }

  if (parsed.modifiers.length > 0) return true;

  if (
    Object.keys(parsed.spellSlotBonus).some((k) => parsed.spellSlotBonus[k])
  ) {
    return true;
  }

  if (parsed.passiveEffects.length > 0) return true;

  if (parsed.immuneSpellIds && parsed.immuneSpellIds.length > 0) return true;

  if (parsed.description?.trim()) return true;

  return false;
}

export function getCompletedArtifactSetsPreview(
  equipped: EquippedItems,
  artifactSets: ArtifactSetRow[],
): CompletedArtifactSetPreview[] {
  const equippedIds = new Set<string>();

  for (const v of Object.values(equipped)) {
    if (typeof v === "string" && v) equippedIds.add(v);
  }

  const out: CompletedArtifactSetPreview[] = [];

  for (const set of artifactSets) {
    const members = set.artifacts ?? [];

    const memberIds = members.map((m) => m.id).filter(Boolean);

    if (memberIds.length === 0) continue;

    if (!memberIds.every((id) => equippedIds.has(id))) continue;

    if (set.setBonus == null) continue;

    const parsed = parseArtifactSetBonus(set.setBonus);

    if (!previewHasDisplayableContent(parsed)) continue;

    const aud = parsed.effectAudience;

    const isBattleScoped =
      aud === ARTIFACT_EFFECT_ALL_ALLIES ||
      aud === ARTIFACT_EFFECT_ALL_ENEMIES;

    out.push({
      setId: set.id,
      setName: set.name,
      displayName: parsed.name?.trim() || set.name,
      parsed,
      isBattleScoped,
    });
  }

  return out;
}
