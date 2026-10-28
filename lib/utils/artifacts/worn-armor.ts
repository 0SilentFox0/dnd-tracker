import { ArtifactModifierType, ArtifactSlot } from "@/lib/constants/artifacts";
import type { WornArmorKind } from "@/lib/utils/abilities/schema/conditions";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-row";
import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

export type { WornArmorKind };

export function wornArmor(p: BattleParticipant): { artifact: EquippedArtifact; stats: ArmorStats } | null {
  for (const artifact of p.battleData.equippedArtifacts ?? []) {
    if (artifact.slot !== ArtifactSlot.ARMOR) continue;

    const stats = armorStatsFromRow(artifact);

    if (stats) return { artifact, stats };
  }

  return null;
}

export const wornArmorCategory = (p: BattleParticipant): WornArmorKind => wornArmor(p)?.stats.category ?? "none";

const hasDamageDice = (a: { modifiers?: unknown }) =>
  Array.isArray(a.modifiers) && a.modifiers.some((m) => m?.type === ArtifactModifierType.DAMAGE_DICE && typeof m.value === "string" && m.value.trim() !== "");

export const hasShield = (p: BattleParticipant): boolean =>
  (p.battleData.equippedArtifacts ?? []).some((a) => a.slot === ArtifactSlot.SHIELD && !hasDamageDice(a));

export function armorWornMatches(p: BattleParticipant, c: { categories: readonly WornArmorKind[]; shield?: "with" | "without" }): boolean {
  if (!c.categories.includes(wornArmorCategory(p))) return false;

  return c.shield === undefined || (c.shield === "with") === hasShield(p);
}
